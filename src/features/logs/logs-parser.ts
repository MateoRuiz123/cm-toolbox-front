import type { LogSeverity, ProcessedLogLine } from "./api/logs-types";

export interface ExtractedLogTimestamp {
  readonly text: string;
  readonly time: string;
  readonly fullTime: string;
}

const KUBE_TIMESTAMP_PREFIX_REGEX =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))(?:\s+(.*))?$/;

const isSameLocalDate = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const pad2 = (n: number): string => String(n).padStart(2, "0");

const formatLogTime = (date: Date, now: Date): string => {
  const clock = date.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  if (isSameLocalDate(date, now)) {
    return clock;
  }
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)} ${clock}`;
};

const formatFullLogTime = (date: Date, rawIso?: string): string => {
  const localDate = `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  const localTime = date.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return rawIso
    ? `${localDate} ${localTime}.${ms} (UTC: ${rawIso})`
    : `${localDate} ${localTime}.${ms}`;
};

/**
 * Extrae el timestamp RFC3339/RFC3339Nano antepuesto por `kubectl logs --timestamps=true`
 * y cae al timestamp de recepción si la línea no incluye prefijo de fecha.
 */
export const extractLogTimestamp = (
  rawLine: string,
  fallbackTimestampMs: number,
): ExtractedLogTimestamp => {
  const now = new Date();
  const match = KUBE_TIMESTAMP_PREFIX_REGEX.exec(rawLine);
  if (match) {
    const [, rawIso, rest] = match;
    const normalizedIso = rawIso.replace(/\.(\d{3})\d+(?=(Z|[+-]\d{2}:\d{2})$)/, ".$1");
    const parsed = new Date(normalizedIso);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        text: rest ?? "",
        time: formatLogTime(parsed, now),
        fullTime: formatFullLogTime(parsed, rawIso),
      };
    }
  }

  const fallback = new Date(fallbackTimestampMs);
  return {
    text: rawLine,
    time: formatLogTime(fallback, now),
    fullTime: formatFullLogTime(fallback),
  };
};

export interface ExtractedJsonSegment {
  readonly prefix: string;
  readonly formatted: string;
  readonly raw: string;
  readonly suffix: string;
}

/**
 * Clasifica la severidad evitando falsos positivos como `"isError":false` o `"error":null`.
 */
export const detectSeverity = (text: string): LogSeverity => {
  const normalized = text
    .toLowerCase()
    .replace(/"?(?:is_?error|has_?error)"?\s*:\s*false/g, "")
    .replace(/"?errors?"?\s*:\s*(?:null|false|\[\]|"")/g, "");

  if (
    normalized.includes('"level":"error"') ||
    normalized.includes('"severity":"error"') ||
    normalized.includes('"iserror":true') ||
    normalized.includes("error") ||
    normalized.includes("exception") ||
    normalized.includes("fatal") ||
    normalized.includes('"status":5')
  ) {
    return "error";
  }
  if (normalized.includes("warn")) return "warn";
  if (normalized.includes("debug")) return "debug";
  return "info";
};

/**
 * Extrae el primer bloque JSON válido de una línea para permitir su visualización formateada.
 */
export const extractJsonSegment = (
  text: string,
): ExtractedJsonSegment | null => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start || end - start + 1 < 15) {
    return null;
  }
  const candidate = text.slice(start, end + 1);
  try {
    const parsed: unknown = JSON.parse(candidate);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return {
      prefix: text.slice(0, start),
      formatted: JSON.stringify(parsed, null, 2),
      raw: candidate,
      suffix: text.slice(end + 1),
    };
  } catch {
    return null;
  }
};

/**
 * Formatea las líneas procesadas en texto plano listo para descargar como `.log`.
 */
export const formatLogsForExport = (
  lines: readonly ProcessedLogLine[],
): string =>
  lines
    .map(
      (line) =>
        `${line.time} [${line.severity.toUpperCase()}]${line.pod ? ` [${line.pod}]` : ""} ${line.text}`,
    )
    .join("\n");
