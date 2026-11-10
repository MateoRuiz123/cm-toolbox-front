import { obtenerToken } from "../auth/token";

export interface RequestOptions extends RequestInit {
  readonly timeoutMs?: number;
  readonly skipAuth?: boolean;
  readonly tokenGetter?: () => string | null;
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly data?: unknown;

  constructor(status: number, code: string, message: string, data?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export interface HttpClient {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  post: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) => Promise<T>;
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  patch: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) => Promise<T>;
  delete: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

export const createHttpClient = (basePath = ""): HttpClient => {
  const request = async <T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> => {
    const {
      timeoutMs = 30_000,
      skipAuth = false,
      tokenGetter = obtenerToken,
      signal: externalSignal,
      headers: customHeaders,
      ...rest
    } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

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

    const headers = new Headers(customHeaders);
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    if (!skipAuth) {
      const token = tokenGetter();
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const url = `${basePath.replace(/\/$/, "")}${
      endpoint.startsWith("/") ? "" : "/"
    }${endpoint}`;

    try {
      const response = await fetch(url, {
        ...rest,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorCode = `HTTP_${response.status}`;
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        let responseData: unknown = undefined;

        try {
          responseData = await response.json();
          if (
            responseData &&
            typeof responseData === "object" &&
            "message" in responseData &&
            typeof (responseData as { message: unknown }).message === "string"
          ) {
            errorMessage = (responseData as { message: string }).message;
          }
          if (
            responseData &&
            typeof responseData === "object" &&
            "code" in responseData &&
            typeof (responseData as { code: unknown }).code === "string"
          ) {
            errorCode = (responseData as { code: string }).code;
          }
        } catch {
          // Si el cuerpo no es JSON, se conserva el mensaje genérico HTTP
        }

        throw new HttpError(
          response.status,
          errorCode,
          errorMessage,
          responseData,
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (externalSignal?.aborted) {
        throw new HttpError(0, "ABORTED", "Petición cancelada por el usuario.");
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new HttpError(
          408,
          "TIMEOUT",
          `La petición excedió el tiempo límite de ${Math.round(
            timeoutMs / 1000,
          )}s.`,
        );
      }
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(
        0,
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Error de red inesperado.",
      );
    } finally {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", handleExternalAbort);
      }
    }
  };

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) => {
      const headers = new Headers(options?.headers);
      let payloadBody: BodyInit | undefined = undefined;
      if (body !== undefined) {
        if (
          typeof body === "string" ||
          body instanceof FormData ||
          body instanceof Blob
        ) {
          payloadBody = body;
        } else {
          headers.set("Content-Type", "application/json");
          payloadBody = JSON.stringify(body);
        }
      }
      return request<T>(path, {
        ...options,
        method: "POST",
        headers,
        body: payloadBody,
      });
    },
    put: <T>(path: string, body?: unknown, options?: RequestOptions) => {
      const headers = new Headers(options?.headers);
      let payloadBody: BodyInit | undefined = undefined;
      if (body !== undefined) {
        if (
          typeof body === "string" ||
          body instanceof FormData ||
          body instanceof Blob
        ) {
          payloadBody = body;
        } else {
          headers.set("Content-Type", "application/json");
          payloadBody = JSON.stringify(body);
        }
      }
      return request<T>(path, {
        ...options,
        method: "PUT",
        headers,
        body: payloadBody,
      });
    },
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) => {
      const headers = new Headers(options?.headers);
      let payloadBody: BodyInit | undefined = undefined;
      if (body !== undefined) {
        if (
          typeof body === "string" ||
          body instanceof FormData ||
          body instanceof Blob
        ) {
          payloadBody = body;
        } else {
          headers.set("Content-Type", "application/json");
          payloadBody = JSON.stringify(body);
        }
      }
      return request<T>(path, {
        ...options,
        method: "PATCH",
        headers,
        body: payloadBody,
      });
    },
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: "DELETE" }),
  };
};
