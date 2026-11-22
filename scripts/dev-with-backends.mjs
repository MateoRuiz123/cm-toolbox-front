/**
 * Orden: infra access → DB docs (cm_toolbox_docs) → MS (8083/8082/8081) → Vite.
 * Sin cm-api-internos. Override: TOOLBOX_LOCAL_ROOT=/ruta/a/local
 *
 * docs-ms arranca con SPECS_DRIVER=postgres contra la misma instancia Postgres
 * que access (:5433), base dedicada cm_toolbox_docs.
 */
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT_ROOT = path.resolve(__dirname, "..");
const LOCAL_ROOT = path.resolve(
  process.env.TOOLBOX_LOCAL_ROOT?.trim() || path.join(FRONT_ROOT, ".."),
);

const BACKENDS = [
  {
    name: "access",
    dir: "cm-toolbox-access-ms",
    color: "\x1b[36m",
    port: 8083,
  },
  { name: "docs", dir: "cm-docs-ms", color: "\x1b[35m", port: 8082 },
  { name: "logs", dir: "cm-logs-ms", color: "\x1b[33m", port: 8081 },
];

const RESET = "\x1b[0m";
const READY_TIMEOUT_MS = 90_000;
const POLL_MS = 400;

const DOCS_DB_NAME = "cm_toolbox_docs";
const DOCS_DATABASE_URL = `postgres://toolbox@127.0.0.1:5433/${DOCS_DB_NAME}`;
const DOCS_PG_CONTAINER = "cm-toolbox-postgres";

const backends = [];
let shuttingDown = false;
let viteChild = null;

const stripClearScreen = (text) =>
  text.replace(/\x1bc|\x1b\[[0-9;]*[HJ]|\x1b\[2J|\x1b\[3J/g, "");

const log = (label, color, chunk) => {
  const text = stripClearScreen(chunk.toString());
  for (const line of text.split(/\r?\n/)) {
    if (line.length === 0) continue;
    // ruido de pnpm al matar el proceso
    if (line.includes("ELIFECYCLE") || line.includes("Command failed")) continue;
    process.stdout.write(`${color}[${label}]${RESET} ${line}\n`);
  }
};

const resolvePnpm = () => (process.platform === "win32" ? "pnpm.cmd" : "pnpm");

const killTree = (child, { processGroup = false } = {}) => {
  if (!child?.pid || child.exitCode !== null) return;
  try {
    if (processGroup && process.platform !== "win32") {
      process.kill(-child.pid, "SIGTERM");
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ya muerto */
    }
  }
};

const isPortOpen = (port, host = "127.0.0.1") =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });

const waitForPort = async (name, port) => {
  const started = Date.now();
  process.stdout.write(`[dev] Esperando ${name} en :${port}…\n`);
  while (Date.now() - started < READY_TIMEOUT_MS) {
    if (shuttingDown) return false;
    if (await isPortOpen(port)) {
      process.stdout.write(`[dev] ${name} listo (:${port})\n`);
      return true;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.error(
    `[dev] Timeout: ${name} no escuchó en :${port} tras ${READY_TIMEOUT_MS / 1000}s`,
  );
  return false;
};

const spawnBackend = (label, color, cwd, envExtra = {}) => {
  const env = { ...process.env, FORCE_COLOR: "1", ...envExtra };
  delete env.NO_COLOR;
  const child = spawn(resolvePnpm(), ["dev"], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
  child.stdout?.on("data", (d) => log(label, color, d));
  child.stderr?.on("data", (d) => log(label, color, d));
  child.on("error", (err) => {
    console.error(`${color}[${label}]${RESET} no arrancó: ${err.message}`);
  });
  backends.push(child);
  return child;
};

const ensureDir = (absDir, label) => {
  if (existsSync(absDir)) return true;
  console.error(
    `[dev] No encontré ${label} en ${absDir}. Clónalo como hermano del front o define TOOLBOX_LOCAL_ROOT.`,
  );
  return false;
};

const runDocker = (args, cwd) =>
  new Promise((resolve) => {
    const child = spawn("docker", args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });

const runDockerCapture = (args, { env = process.env } = {}) =>
  new Promise((resolve) => {
    const child = spawn("docker", args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("exit", (code) =>
      resolve({ code: code ?? 1, stdout, stderr }),
    );
  });

/**
 * Docker Desktop y el daemon del sistema pueden coexistir. Si Postgres del
 * toolbox ya corre en uno, fijamos DOCKER_HOST ahí para no chocar :5433/:6380.
 * Respeta DOCKER_HOST si el usuario ya lo definió.
 */
const listDockerHostCandidates = () => {
  const candidates = [];
  const seen = new Set();
  const add = (host) => {
    const key = host ?? "";
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(host);
  };

  add(undefined);
  if (process.platform !== "win32" && existsSync("/var/run/docker.sock")) {
    add("unix:///var/run/docker.sock");
  }
  const home = process.env.HOME?.trim();
  if (home) {
    const desktopSock = path.join(home, ".docker", "desktop", "docker.sock");
    if (existsSync(desktopSock)) {
      add(`unix://${desktopSock}`);
    }
  }
  return candidates;
};

const dockerEnvForHost = (host) => {
  const env = { ...process.env };
  if (host) env.DOCKER_HOST = host;
  else delete env.DOCKER_HOST;
  return env;
};

const resolveDockerHost = async () => {
  const userHost = process.env.DOCKER_HOST?.trim();
  if (userHost) {
    process.stdout.write(`[dev] DOCKER_HOST=${userHost} (env)\n`);
    return;
  }

  /** @type {string | undefined | null} null = no hallado; undefined = contexto actual */
  let withRunning = null;
  /** @type {string | undefined | null} */
  let withExists = null;
  /** @type {string | undefined} */
  let firstWorking;
  let foundWorking = false;

  for (const host of listDockerHostCandidates()) {
    const env = dockerEnvForHost(host);
    const info = await runDockerCapture(["info", "-f", "{{.ServerVersion}}"], {
      env,
    });
    if (info.code !== 0) continue;
    if (!foundWorking) {
      foundWorking = true;
      firstWorking = host;
    }

    const status = await runDockerCapture(
      ["inspect", "-f", "{{.State.Status}}", DOCS_PG_CONTAINER],
      { env },
    );
    if (status.code !== 0) continue;
    const state = status.stdout.trim();
    if (state === "running") {
      withRunning = host;
      break;
    }
    if (withExists === null) withExists = host;
  }

  if (!foundWorking) {
    console.warn(
      "[dev] Docker no responde; intento compose con el contexto actual.",
    );
    return;
  }

  const chosen =
    withRunning !== null
      ? withRunning
      : withExists !== null
        ? withExists
        : firstWorking;

  if (chosen) {
    process.env.DOCKER_HOST = chosen;
    process.stdout.write(
      `[dev] DOCKER_HOST=${chosen} (auto: ${DOCS_PG_CONTAINER})\n`,
    );
    return;
  }

  delete process.env.DOCKER_HOST;
  process.stdout.write("[dev] Docker: contexto actual\n");
};

const applySqlViaDocker = (sqlFile, database = DOCS_DB_NAME) =>
  new Promise((resolve) => {
    const child = spawn(
      "docker",
      [
        "exec",
        "-i",
        DOCS_PG_CONTAINER,
        "psql",
        "-U",
        "toolbox",
        "-d",
        database,
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32",
      },
    );
    let stderr = "";
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("exit", (code) => resolve({ code: code ?? 1, stderr }));
    createReadStream(sqlFile).pipe(child.stdin);
  });

/**
 * Preferente: docker-compose.dev.yml del front (Postgres + Redis).
 * Fallback: compose de cm-toolbox-access-ms.
 */
const startDevInfra = async (accessRoot) => {
  const frontCompose = path.join(FRONT_ROOT, "docker-compose.dev.yml");
  const accessCompose = path.join(accessRoot, "docker-compose.yml");

  const useFront = existsSync(frontCompose);
  const composeDir = useFront ? FRONT_ROOT : accessRoot;
  const composeFile = useFront ? frontCompose : accessCompose;

  if (!existsSync(composeFile)) {
    console.warn(
      "[dev] No hay docker-compose.dev.yml ni compose de access-ms; omito infra.",
    );
    return;
  }

  process.stdout.write(
    `[dev] 1/5 Infra (Postgres :5433 + Redis :6380) vía ${path.basename(composeFile)}…\n`,
  );

  const composeEnv = {
    ...process.env,
    TOOLBOX_LOCAL_ROOT: LOCAL_ROOT,
  };

  const runCompose = (args) =>
    new Promise((resolve) => {
      const child = spawn("docker", ["compose", "-f", composeFile, ...args], {
        cwd: composeDir,
        env: composeEnv,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("exit", (code) => resolve(code ?? 1));
    });

  // --wait espera healthcheck de postgres/redis
  const code = await runCompose(["up", "-d", "--wait"]);
  if (code !== 0) {
    console.warn("[dev] docker compose --wait falló; reintento sin --wait…");
    await runCompose(["up", "-d"]);
    await waitForPort("postgres", 5433);
    await waitForPort("redis", 6380);
  }
};

/**
 * Crea cm_toolbox_docs (si falta) y aplica schema + seed del docs-ms.
 * Misma instancia Postgres que access (:5433). Idempotente.
 * @returns {Promise<boolean>} true si docs debe arrancar con SPECS_DRIVER=postgres
 */
const ensureDocsPostgres = async (docsRoot) => {
  const schemaSql = path.join(docsRoot, "sql", "001_docs_schema.sql");
  const seedSql = path.join(docsRoot, "sql", "002_seed_docs.sql");
  if (!existsSync(schemaSql) || !existsSync(seedSql)) {
    console.warn(
      "[dev] No encontré sql/001_docs_schema.sql o 002_seed_docs.sql; docs → SPECS_DRIVER=local.",
    );
    return false;
  }

  process.stdout.write(
    `[dev] 2/5 Postgres docs: DB ${DOCS_DB_NAME} + schema/seed…\n`,
  );

  if (!(await isPortOpen(5433))) {
    const ok = await waitForPort("postgres", 5433);
    if (!ok) {
      console.warn(
        "[dev] Postgres :5433 no responde; docs → SPECS_DRIVER=local.",
      );
      return false;
    }
  }

  const exists = await runDockerCapture([
    "exec",
    DOCS_PG_CONTAINER,
    "psql",
    "-U",
    "toolbox",
    "-d",
    "postgres",
    "-Atc",
    `SELECT 1 FROM pg_database WHERE datname='${DOCS_DB_NAME}'`,
  ]);
  if (exists.code !== 0) {
    console.warn(
      `[dev] No pude consultar Postgres (${exists.stderr.trim() || exists.code}); docs → local.`,
    );
    return false;
  }

  if (exists.stdout.trim() !== "1") {
    const created = await runDockerCapture([
      "exec",
      DOCS_PG_CONTAINER,
      "psql",
      "-U",
      "toolbox",
      "-d",
      "postgres",
      "-c",
      `CREATE DATABASE ${DOCS_DB_NAME} OWNER toolbox;`,
    ]);
    if (created.code !== 0) {
      console.warn(
        `[dev] CREATE DATABASE falló: ${created.stderr.trim() || created.code}; docs → local.`,
      );
      return false;
    }
    process.stdout.write(`[dev] Creada base ${DOCS_DB_NAME}\n`);
  } else {
    process.stdout.write(`[dev] Base ${DOCS_DB_NAME} ya existe\n`);
  }

  for (const sqlFile of [schemaSql, seedSql]) {
    const applied = await applySqlViaDocker(sqlFile);
    if (applied.code !== 0) {
      console.warn(
        `[dev] Falló ${path.basename(sqlFile)}: ${applied.stderr.trim() || applied.code}; docs → local.`,
      );
      return false;
    }
  }

  process.stdout.write(`[dev] Schema/seed docs OK → ${DOCS_DATABASE_URL}\n`);
  return true;
};

const shutdown = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write("\n[dev] Deteniendo…\n");
  for (const child of backends) killTree(child, { processGroup: true });
  if (viteChild) killTree(viteChild);

  const force = setTimeout(() => process.exit(exitCode), 4_000);
  force.unref?.();

  const wait = [...backends, viteChild]
    .filter(Boolean)
    .map(
      (c) =>
        new Promise((r) => {
          if (c.exitCode !== null) r();
          else c.once("exit", () => r());
        }),
    );
  Promise.all(wait).then(() => {
    clearTimeout(force);
    process.exit(exitCode);
  });
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const main = async () => {
  process.stdout.write(`[dev] LOCAL_ROOT=${LOCAL_ROOT}\n`);

  for (const backend of BACKENDS) {
    if (!ensureDir(path.join(LOCAL_ROOT, backend.dir), backend.dir)) {
      process.exit(1);
    }
  }

  const viteJs = path.join(FRONT_ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteJs)) {
    console.error(`[dev] No encontré Vite en ${viteJs}. Ejecuta pnpm install.`);
    process.exit(1);
  }

  await resolveDockerHost();

  const docsRoot = path.join(LOCAL_ROOT, "cm-docs-ms");

  // 1) Infra (postgres :5433 + redis) — docker-compose.dev.yml del front
  const accessRoot = path.join(LOCAL_ROOT, "cm-toolbox-access-ms");
  await startDevInfra(accessRoot);

  // El volumen de Postgres no re-ejecuta init. 005/006/007 viven en ../cm-toolbox-access-ms/sql/
  // (cm-toolbox-front/sql/ solo conserva 001-003). Se omiten sin fallar si no existen.
  const accessDocsSeed = path.join(accessRoot, "sql", "005_seed_docs_app.sql");
  const accessBackendsSeed = path.join(
    accessRoot,
    "sql",
    "006_seed_backends_app.sql",
  );
  const accessIconsMigration = path.join(
    accessRoot,
    "sql",
    "007_update_app_icons.sql",
  );
  for (const seedPath of [
    accessDocsSeed,
    accessBackendsSeed,
    accessIconsMigration,
  ]) {
    if (!existsSync(seedPath)) {
      console.info(
        `[dev] SQL opcional no encontrado (${path.relative(LOCAL_ROOT, seedPath)}); omitiendo.`,
      );
      continue;
    }
    const seeded = await applySqlViaDocker(seedPath, "cm_toolbox_access");
    if (seeded.code === 0) {
      await runDockerCapture([
        "exec",
        "cm-toolbox-redis",
        "redis-cli",
        "DEL",
        "rbac:catalog:apps",
      ]);
    }
  }

  // 2) DB docs dedicada + schema/seed
  const docsUsePostgres = await ensureDocsPostgres(docsRoot);

  // 3) MS en paralelo
  process.stdout.write("[dev] 3/5 Arrancando access, docs, logs…\n");
  for (const backend of BACKENDS) {
    const envExtra =
      backend.name === "docs" && docsUsePostgres
        ? {
            SPECS_DRIVER: "postgres",
            DATABASE_URL: DOCS_DATABASE_URL,
            CLIENTS_DRIVER: "postgres",
          }
        : backend.name === "docs"
          ? { SPECS_DRIVER: "local" }
          : {};
    if (backend.name === "docs") {
      process.stdout.write(
        docsUsePostgres
          ? `[dev] docs → SPECS_DRIVER=postgres (${DOCS_DATABASE_URL})\n`
          : "[dev] docs → SPECS_DRIVER=local (fallback)\n",
      );
    }
    spawnBackend(
      backend.name,
      backend.color,
      path.join(LOCAL_ROOT, backend.dir),
      envExtra,
    );
  }

  // 4) Esperar puertos antes de Vite
  process.stdout.write("[dev] 4/5 Esperando que los MS escuchen…\n");
  for (const backend of BACKENDS) {
    const ok = await waitForPort(backend.name, backend.port);
    if (!ok) {
      shutdown(1);
      return;
    }
  }

  // 5) Front
  process.stdout.write(
    "\n[dev] 5/5 Vite listo → http://localhost:3000/\n\n",
  );
  viteChild = spawn(process.execPath, [viteJs, "--port", "3000", "--host"], {
    cwd: FRONT_ROOT,
    env: process.env,
    stdio: "inherit",
  });

  await new Promise((resolve) => {
    viteChild.on("exit", (code) => {
      if (!shuttingDown) shutdown(code ?? 0);
      resolve();
    });
    viteChild.on("error", (err) => {
      console.error(`[dev] Vite no arrancó: ${err.message}`);
      if (!shuttingDown) shutdown(1);
      resolve();
    });
  });
};

main().catch((err) => {
  console.error(err);
  shutdown(1);
});
