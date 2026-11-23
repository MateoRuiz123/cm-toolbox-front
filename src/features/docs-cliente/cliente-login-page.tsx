import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { esAuthBypassActivo } from "@/shared/auth/auth-bypass";
import { safeStorage } from "@/shared/lib/safe-storage";
import { useTransitionNavigate } from "@/shared/lib/use-transition-navigate";
import { Skeleton, SkeletonRegion } from "@/shared/ui/skeleton";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import {
  DocsApiError,
  activateClientAccount,
  claimClientActivationLink,
} from "../docs/api/docs-api";
import {
  ensureClienteSession,
  loginCliente,
  resetPasswordCliente,
} from "./auth/cliente-session";
import { ClienteShell } from "./cliente-shell";

const USED_TOKENS_STORAGE_KEY = "cm-toolbox:used-activation-tokens";
const SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

const inFlightOpenClaims = new Map<
  string,
  Promise<{ readonly valid: boolean; readonly claimToken?: string }>
>();

const readUsedTokens = (): string[] => {
  try {
    const raw = safeStorage.getItem(USED_TOKENS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
};

const isTokenMarkedUsed = (token: string): boolean =>
  readUsedTokens().includes(token);

const markTokenUsed = (token: string): void => {
  const current = readUsedTokens();
  if (current.includes(token)) return;
  safeStorage.setItem(
    USED_TOKENS_STORAGE_KEY,
    JSON.stringify([...current.slice(-49), token]),
  );
};

interface PasswordCheckItem {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
}

const evaluatePasswordChecks = (password: string): PasswordCheckItem[] => [
  { id: "minLength", label: "Mínimo 8 caracteres", passed: password.length >= 8 },
  {
    id: "uppercase",
    label: "Una letra mayúscula (A-Z)",
    passed: /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Una letra minúscula (a-z)",
    passed: /[a-z]/.test(password),
  },
  { id: "number", label: "Un número (0-9)", passed: /[0-9]/.test(password) },
  {
    id: "special",
    label: "Un carácter especial (!@#$%...)",
    passed: SPECIAL_CHAR_RE.test(password),
  },
];

const AnimatedEyeButton = ({
  visible,
  onToggle,
  fieldLabel,
}: {
  readonly visible: boolean;
  readonly onToggle: () => void;
  readonly fieldLabel: string;
}) => (
  <button
    type="button"
    aria-label={visible ? `Ocultar ${fieldLabel}` : `Mostrar ${fieldLabel}`}
    aria-pressed={visible}
    onClick={onToggle}
    className="absolute inset-y-0 right-1.5 my-auto flex size-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-card)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4.5 overflow-visible"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        className="transition-all duration-200 ease-out"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        className={`origin-center transition-all duration-200 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-75 opacity-60"
        }`}
      />
      <path
        d="M3 3l18 18"
        strokeDasharray="26"
        strokeDashoffset={visible ? 26 : 0}
        className="transition-all duration-200 ease-out"
      />
    </svg>
  </button>
);

/**
 * Login clientes: Keycloak client OIDC distinto (sin Google).
 * Si recibe `?client=...&activation_token=...`, reclama el link de un solo uso,
 * valida seguridad de contraseña e inhabilita re-aperturas futuras.
 */
export const ClienteLoginPage = () => {
  const navigate = useTransitionNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mountNowMs] = useState(() => Date.now());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [devClientId, setDevClientId] = useState("demo");

  const activationState = useMemo(() => {
    const client = searchParams.get("client")?.trim();
    const token = searchParams.get("activation_token")?.trim();
    const expiresAtRaw = searchParams.get("expires_at")?.trim() ?? null;
    if (!client || !token) return null;
    const expiresDate = expiresAtRaw ? new Date(expiresAtRaw) : null;
    const isValidDate =
      expiresDate !== null && !Number.isNaN(expiresDate.getTime());
    const expired = isValidDate && expiresDate.getTime() < mountNowMs;
    return {
      client,
      token,
      expiresAtRaw,
      expired,
      expiresLabel: isValidDate ? expiresDate.toLocaleString("es-CO") : null,
    };
  }, [mountNowMs, searchParams]);

  const [alreadyUsedOnMount] = useState(() =>
    Boolean(
      activationState &&
        !activationState.expired &&
        isTokenMarkedUsed(activationState.token),
    ),
  );
  const [openResult, setOpenResult] = useState<{
    readonly token: string;
    readonly valid: boolean;
    readonly claimToken: string | null;
  } | null>(null);

  const hasActivationParams = Boolean(activationState);
  const resolvedForCurrentToken =
    activationState && openResult?.token === activationState.token
      ? openResult
      : null;
  const linkUsed = Boolean(
    activationState &&
      !activationState.expired &&
      (alreadyUsedOnMount ||
        (resolvedForCurrentToken !== null && !resolvedForCurrentToken.valid)),
  );
  const validatingLink = Boolean(
    activationState &&
      !activationState.expired &&
      !alreadyUsedOnMount &&
      resolvedForCurrentToken === null,
  );
  const claimToken = resolvedForCurrentToken?.claimToken ?? null;

  const passwordChecks = useMemo(
    () => evaluatePasswordChecks(password),
    [password],
  );
  const passedChecksCount = useMemo(
    () => passwordChecks.filter((c) => c.passed).length,
    [passwordChecks],
  );
  const allPasswordChecksPassed = passedChecksCount === passwordChecks.length;

  useEffect(() => {
    if (!activationState) {
      let cancelled = false;
      void ensureClienteSession().then((status) => {
        if (cancelled) return;
        if (status === "authenticated") {
          navigate("/cliente/docs", { replace: true });
          return;
        }
        setChecking(false);
      });
      return () => {
        cancelled = true;
      };
    }

    if (activationState.expired || alreadyUsedOnMount) {
      return;
    }

    const token = activationState.token;
    const cacheKey = `${activationState.client}|${token}`;

    let cancelled = false;
    let pending = inFlightOpenClaims.get(cacheKey);
    if (!pending) {
      pending = claimClientActivationLink({
        clientId: activationState.client,
        activationToken: token,
        expiresAt: activationState.expiresAtRaw,
      }).finally(() => {
        inFlightOpenClaims.delete(cacheKey);
      });
      inFlightOpenClaims.set(cacheKey, pending);
    }

    void pending
      .then((res) => {
        markTokenUsed(token);
        if (cancelled) return;
        setOpenResult({
          token,
          valid: Boolean(res?.valid),
          claimToken: res?.claimToken ?? null,
        });
      })
      .catch(() => {
        markTokenUsed(token);
        if (cancelled) return;
        setOpenResult({
          token,
          valid: false,
          claimToken: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activationState, alreadyUsedOnMount, navigate]);

  const handleActivate = async (event: FormEvent) => {
    event.preventDefault();
    if (!activationState || linkUsed) return;
    setError(null);

    const firstFailed = passwordChecks.find((c) => !c.passed);
    if (firstFailed) {
      setError(`La contraseña debe cumplir: ${firstFailed.label}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await activateClientAccount({
        clientId: activationState.client,
        activationToken: activationState.token,
        claimToken,
        expiresAt: activationState.expiresAtRaw,
        password,
      });
      markTokenUsed(activationState.token);
      await loginCliente(activationState.client);
      navigate("/cliente/docs", { replace: true });
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible activar la cuenta. Verifica el enlace.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginCliente(
        esAuthBypassActivo() ? devClientId.trim() || "demo" : undefined,
      );
      navigate("/cliente/docs", { replace: true });
    } catch {
      setError("No pudimos iniciar sesión. Revisa usuario y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  if (checking && !hasActivationParams) {
    return (
      <ClienteShell>
        <SkeletonRegion
          label="Cargando…"
          className="mx-auto w-full max-w-sm space-y-4 px-4 py-16"
        >
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-2)]" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-2)]" />
          <Skeleton className="h-10 w-full rounded-full" />
        </SkeletonRegion>
      </ClienteShell>
    );
  }

  return (
    <ClienteShell>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div
          style={{ boxShadow: "var(--shadow-panel)" }}
          className="surface w-full max-w-md rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-8"
        >
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--border-default)] pb-5">
            <img
              src="/logo-coordinadora.png"
              alt="Logotipo de Coordinadora Mercantil"
              className="h-6 w-auto object-contain dark:brightness-0 dark:invert"
            />
            <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Portal de Integraciones
            </span>
          </div>

          <SmoothTitleAccent
            as="h1"
            className="text-2xl font-bold text-[var(--text-body)]"
            accessibleTitle="Documentación para clientes"
            before="Documentación para "
            accent="clientes"
            amplitude={3}
          />
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Ingresa con las credenciales asignadas a tu organización.
          </p>

          {activationState ? (
            <div
              role="status"
              className={`mt-5 rounded-[var(--radius-2)] border p-3 text-xs ${
                activationState.expired || linkUsed
                  ? "border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] text-[var(--state-error)]"
                  : "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--text-body)]"
              }`}
            >
              {activationState.expired ? (
                <p>
                  El enlace temporal para{" "}
                  <strong className="font-mono">
                    {activationState.client}
                  </strong>{" "}
                  expiró. Solicita un reenvío al equipo de Coordinadora.
                </p>
              ) : linkUsed ? (
                <p>
                  Este enlace de activación ya fue utilizado y se encuentra
                  inhabilitado. Solicita uno nuevo al administrador.
                </p>
              ) : validatingLink ? (
                <p>Verificando enlace de activación...</p>
              ) : (
                <p>
                  Enlace de activación listo para{" "}
                  <strong className="font-mono">
                    {activationState.client}
                  </strong>
                  {activationState.expiresLabel
                    ? ` (vigente hasta ${activationState.expiresLabel})`
                    : ""}
                  .
                </p>
              )}
            </div>
          ) : null}

          {activationState && !activationState.expired && linkUsed ? (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => navigate("/cliente/login", { replace: true })}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
              >
                Ir al inicio de sesión de clientes
              </button>
            </div>
          ) : activationState && !activationState.expired && validatingLink ? (
            <div className="mt-6 space-y-3" aria-busy="true">
              <Skeleton className="h-10 w-full rounded-[var(--radius-2)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-2)]" />
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          ) : activationState && !activationState.expired ? (
            <form
              onSubmit={(e) => void handleActivate(e)}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="new-client-password"
                  className="block text-xs font-bold text-[var(--text-body)]"
                >
                  Nueva contraseña
                </label>
                <div className="relative mt-1">
                  <input
                    id="new-client-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    placeholder="Crea una contraseña segura"
                    className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] py-2 pl-3 pr-11 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  />
                  <AnimatedEyeButton
                    visible={showPassword}
                    fieldLabel="nueva contraseña"
                    onToggle={() => setShowPassword((prev) => !prev)}
                  />
                </div>

                {/* Indicador de fortaleza + checks en tiempo real */}
                <div className="mt-2.5 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/70 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--text-muted)]">
                      Seguridad de contraseña
                    </span>
                    <span
                      className={`font-bold ${
                        allPasswordChecksPassed
                          ? "text-[var(--state-success)]"
                          : passedChecksCount >= 3
                            ? "text-[var(--state-warning)]"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {passedChecksCount}/{passwordChecks.length} requisitos
                    </span>
                  </div>

                  <div
                    aria-hidden="true"
                    className="mb-2.5 grid grid-cols-5 gap-1"
                  >
                    {passwordChecks.map((check, idx) => {
                      const active = idx < passedChecksCount;
                      const barColor = !active
                        ? "bg-[var(--border-default)]"
                        : allPasswordChecksPassed
                          ? "bg-[var(--state-success)]"
                          : passedChecksCount >= 3
                            ? "bg-[var(--state-warning)]"
                            : "bg-[var(--state-error)]";
                      return (
                        <span
                          key={check.id}
                          className={`h-1.5 rounded-full transition-colors duration-200 ${barColor}`}
                        />
                      );
                    })}
                  </div>

                  <ul
                    aria-label="Requisitos de contraseña"
                    className="space-y-1 text-[11px]"
                  >
                    {passwordChecks.map((check) => (
                      <li
                        key={check.id}
                        data-passed={check.passed ? "true" : "false"}
                        className={`flex items-center gap-1.5 transition-colors ${
                          check.passed
                            ? "font-medium text-[var(--state-success)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 16 16"
                          className="size-3.5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {check.passed ? (
                            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                          ) : (
                            <circle cx="8" cy="8" r="5" />
                          )}
                        </svg>
                        <span>{check.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-client-password"
                  className="block text-xs font-bold text-[var(--text-body)]"
                >
                  Confirmar contraseña
                </label>
                <div className="relative mt-1">
                  <input
                    id="confirm-client-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                    placeholder="Repite la contraseña"
                    className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] py-2 pl-3 pr-11 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  />
                  <AnimatedEyeButton
                    visible={showConfirmPassword}
                    fieldLabel="confirmación de contraseña"
                    onToggle={() => setShowConfirmPassword((prev) => !prev)}
                  />
                </div>
                {confirmPassword.length > 0 ? (
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      password === confirmPassword
                        ? "text-[var(--state-success)]"
                        : "text-[var(--state-error)]"
                    }`}
                  >
                    {password === confirmPassword
                      ? "Las contraseñas coinciden."
                      : "Las contraseñas aún no coinciden."}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)] disabled:opacity-50"
              >
                {loading ? "Activando…" : "Activar cuenta y entrar"}
              </button>
            </form>
          ) : esAuthBypassActivo() ? (
            <div className="mt-7 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Modo local: el servicio usa{" "}
                <code className="font-mono">AUTH_MODE=disabled</code>. Puedes
                entrar con cualquier NIT de cliente sin Keycloak.
              </p>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-body)]">
                  NIT / Identificador de cliente
                </span>
                <input
                  type="text"
                  aria-label="NIT o identificador de cliente"
                  value={devClientId}
                  onChange={(e) => setDevClientId(e.target.value)}
                  placeholder="demo"
                  className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                />
              </label>
              <button
                type="button"
                disabled={loading || activationState?.expired === true}
                onClick={() => void handleLogin()}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)] disabled:opacity-50"
              >
                Entrar (dev)
              </button>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Serás redirigido al inicio de sesión seguro (usuario y
                contraseña). No se usa Google en este acceso.
              </p>
              <button
                type="button"
                disabled={loading || activationState?.expired === true}
                onClick={() => void handleLogin()}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)] disabled:opacity-50"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
              <button
                type="button"
                className="block w-full cursor-pointer text-center text-sm text-[var(--color-primary)] hover:underline"
                onClick={() => {
                  void resetPasswordCliente().catch(() => {
                    setError(
                      "No pudimos abrir el restablecimiento de contraseña.",
                    );
                  });
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-4 text-sm text-[var(--state-error)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </ClienteShell>
  );
};
