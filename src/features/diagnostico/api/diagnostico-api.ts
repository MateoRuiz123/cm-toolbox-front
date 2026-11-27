import { env } from "../../../shared/lib/env";
import type {
  AsignarEquipoDespachoInput,
  AsignarEquipoDespachoOutput,
  DiagnosticoInput,
  DiagnosticoOutput,
  ReintentoResultado,
} from "./types";

const TIMEOUT_MS = 120_000;
const REINTENTO_TIMEOUT_MS = 30_000;

interface ApiEnvelope {
  data?: DiagnosticoOutput;
  message?: string;
}

export class DiagnosticoApiError extends Error {}

export const diagnosticarMigracion = async (
  input: DiagnosticoInput,
  externalSignal?: AbortSignal,
): Promise<DiagnosticoOutput> => {
  const url = env.diagnosticoUrl;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Combinar señal de aborto externa con timeout interno
  const handleExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", handleExternalAbort, {
        once: true,
      });
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const body = (await response.json()) as ApiEnvelope;

    if (!response.ok) {
      throw new DiagnosticoApiError(
        body.message ?? "No fue posible completar el diagnóstico.",
      );
    }

    if (!body.data) {
      throw new DiagnosticoApiError(
        "El API respondió sin datos de diagnóstico.",
      );
    }

    return body.data;
  } catch (error) {
    if (externalSignal?.aborted) {
      throw new DiagnosticoApiError("Consulta cancelada por el usuario.");
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DiagnosticoApiError(
        "La consulta tardó más de 120 segundos. Intenta con menos códigos.",
      );
    }
    if (error instanceof DiagnosticoApiError) {
      throw error;
    }
    throw new DiagnosticoApiError(
      "No fue posible conectar con el servicio de diagnóstico.",
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", handleExternalAbort);
    }
  }
};

/**
 * Reintenta la migración de una remisión enviando el payload emulado de Pub/Sub
 * a POST /migracion/guia.
 */
export const reintentarMigracionGuia = async (
  codigoRemision: string,
): Promise<ReintentoResultado> => {
  const url = env.migrarGuiaUrl;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    REINTENTO_TIMEOUT_MS,
  );

  try {
    const rawData = JSON.stringify({ codigo_remision: String(codigoRemision) });
    const encodedBody = btoa(unescape(encodeURIComponent(rawData)));
    const messageId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const publishTime = new Date().toISOString();

    const body = {
      message: {
        data: encodedBody,
        messageId,
        message_id: messageId,
        publishTime,
        publish_time: publishTime,
      },
      subscription: env.pubsubSubscription,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseBody = (await response.json().catch(() => ({}))) as {
      message?: string;
      state?: boolean;
      code?: number;
    };

    if (response.status === 200 && responseBody.state !== false) {
      return {
        codigo_remision: codigoRemision,
        success: true,
        message: responseBody.message ?? "Migración solicitada correctamente.",
      };
    }

    return {
      codigo_remision: codigoRemision,
      success: false,
      message:
        responseBody.message ||
        `No fue posible forzar la migración (código HTTP ${response.status}).`,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        codigo_remision: codigoRemision,
        success: false,
        message: "Tiempo de espera agotado al reintentar.",
      };
    }
    return {
      codigo_remision: codigoRemision,
      success: false,
      message: error instanceof Error ? error.message : "Error al conectar.",
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

/**
 * Asigna equipo, recibidor y móvil en `agw_despachos` (operación permitida solo en ambiente testing).
 */
export const asignarEquipoDespachoTesting = async (
  input: AsignarEquipoDespachoInput,
): Promise<AsignarEquipoDespachoOutput> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    REINTENTO_TIMEOUT_MS,
  );

  try {
    const response = await fetch(env.asignarEquipoDespachoUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as {
      data?: AsignarEquipoDespachoOutput;
      message?: string;
    };

    if (!response.ok || !body.data) {
      throw new DiagnosticoApiError(
        body.message ||
          `No fue posible actualizar el despacho en AGW (HTTP ${response.status}).`,
      );
    }

    return body.data;
  } catch (error) {
    if (error instanceof DiagnosticoApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DiagnosticoApiError(
        "Tiempo de espera agotado al actualizar el despacho.",
      );
    }
    throw new DiagnosticoApiError(
      "No fue posible conectar con el servicio para actualizar el despacho.",
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};
