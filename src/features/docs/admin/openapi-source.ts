export type OpenApiSourceMode = "file" | "editor" | "builder";

const MAX_BYTES = 2 * 1024 * 1024;

/** Detecta extensión razonable para el blob OpenAPI. */
export const openApiFileName = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "openapi.json";
  }
  return "openapi.yaml";
};

/** Construye un `File` a partir del texto del editor del portal. */
export const fileFromOpenApiText = (text: string): File => {
  const name = openApiFileName(text);
  const type = name.endsWith(".json")
    ? "application/json"
    : "application/yaml";
  return new File([text], name, { type });
};

/** Modos que publican desde texto (editor o constructor). */
export const isTextSourceMode = (
  mode: OpenApiSourceMode,
): mode is "editor" | "builder" => mode === "editor" || mode === "builder";

export const validateOpenApiSource = (
  file: File | null,
  editorText: string,
  mode: OpenApiSourceMode,
): string | null => {
  if (mode === "file") {
    if (!file) return "Selecciona un archivo OpenAPI 3.x.";
    if (file.size > MAX_BYTES) {
      return "El archivo excede el tamaño máximo de 2 MiB.";
    }
    return null;
  }
  if (!editorText.trim()) {
    return mode === "builder"
      ? "Completa el Constructor o añade al menos los datos generales."
      : "Escribe o pega la especificación OpenAPI 3.x en el editor.";
  }
  const bytes = new TextEncoder().encode(editorText).length;
  if (bytes > MAX_BYTES) {
    return "El contenido excede el tamaño máximo de 2 MiB.";
  }
  return null;
};

export const resolveOpenApiFile = (
  mode: OpenApiSourceMode,
  file: File | null,
  editorText: string,
): File => {
  if (mode === "file") {
    if (!file) throw new Error("Archivo OpenAPI requerido.");
    return file;
  }
  return fileFromOpenApiText(editorText);
};

export { MAX_BYTES as OPENAPI_MAX_BYTES };
