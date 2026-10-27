const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
] as const;

export type DraftHttpMethod = (typeof HTTP_METHODS)[number];

export type DraftFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array"
  | "object";

export type DraftBodyField = {
  readonly id: string;
  readonly name: string;
  readonly type: DraftFieldType;
  readonly required: boolean;
  readonly description: string;
  readonly example: string;
};

export type DraftResponse = {
  readonly id: string;
  readonly status: string;
  readonly description: string;
  readonly exampleJson: string;
};

export type DraftOperation = {
  readonly id: string;
  readonly method: DraftHttpMethod;
  readonly path: string;
  readonly summary: string;
  readonly description: string;
  readonly bodyFields: readonly DraftBodyField[];
  readonly success: DraftResponse;
  readonly errors: readonly DraftResponse[];
};

export type OpenApiDraft = {
  readonly title: string;
  readonly version: string;
  readonly description: string;
  readonly serverUrl: string;
  readonly bearerAuth: boolean;
  readonly operations: readonly DraftOperation[];
  /** true si el OpenAPI original tenía schemas anidados / $ref no representables. */
  readonly advancedWarning: boolean;
};

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

let idCounter = 0;
const nextId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
};

/** Reinicia el contador de ids (solo tests). */
export const resetDraftIdsForTests = (): void => {
  idCounter = 0;
};

export const createEmptyDraft = (): OpenApiDraft => ({
  title: "",
  version: "1.0.0",
  description: "",
  serverUrl: "",
  bearerAuth: false,
  operations: [],
  advancedWarning: false,
});

export const createEmptyOperation = (): DraftOperation => ({
  id: nextId("op"),
  method: "post",
  path: "/recurso",
  summary: "",
  description: "",
  bodyFields: [],
  success: {
    id: nextId("res"),
    status: "200",
    description: "OK",
    exampleJson: "",
  },
  errors: [],
});

export const createEmptyBodyField = (): DraftBodyField => ({
  id: nextId("field"),
  name: "campo",
  type: "string",
  required: true,
  description: "",
  example: "",
});

export const createEmptyErrorResponse = (): DraftResponse => ({
  id: nextId("err"),
  status: "400",
  description: "Solicitud inválida",
  exampleJson: "",
});

const parseExampleValue = (
  type: DraftFieldType,
  example: string,
): unknown => {
  const trimmed = example.trim();
  if (!trimmed) return undefined;
  if (type === "number" || type === "integer") {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (type === "boolean") {
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    return trimmed;
  }
  if (type === "array" || type === "object") {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const tryParseJson = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
};

const schemaHasAdvanced = (schema: JsonRecord): boolean => {
  if (schema.$ref || schema.allOf || schema.oneOf || schema.anyOf) return true;
  const props = asRecord(schema.properties);
  if (!props) return false;
  return Object.values(props).some((raw) => {
    const prop = asRecord(raw);
    if (!prop) return false;
    if (prop.$ref || prop.allOf || prop.oneOf || prop.anyOf) return true;
    if (prop.type === "object" && asRecord(prop.properties)) return true;
    if (prop.type === "array") {
      const items = asRecord(prop.items);
      if (items && (items.type === "object" || items.$ref)) return true;
    }
    return false;
  });
};

const fieldsFromSchema = (
  schema: JsonRecord | null,
): { fields: DraftBodyField[]; advanced: boolean } => {
  if (!schema) return { fields: [], advanced: false };
  const advanced = schemaHasAdvanced(schema);
  const props = asRecord(schema.properties) ?? {};
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === "string")
      : [],
  );
  const fields = Object.entries(props).map(([name, raw]) => {
    const prop = asRecord(raw) ?? {};
    const typeRaw = asString(prop.type) || "string";
    const type = (
      ["string", "number", "integer", "boolean", "array", "object"] as const
    ).includes(typeRaw as DraftFieldType)
      ? (typeRaw as DraftFieldType)
      : "string";
    const example =
      prop.example !== undefined
        ? typeof prop.example === "string"
          ? prop.example
          : JSON.stringify(prop.example)
        : "";
    return {
      id: nextId("field"),
      name,
      type,
      required: required.has(name),
      description: asString(prop.description),
      example,
    };
  });
  return { fields, advanced };
};

const responseFromOpenApi = (
  status: string,
  raw: unknown,
): { response: DraftResponse; advanced: boolean } => {
  const record = asRecord(raw) ?? {};
  const content = asRecord(record.content);
  const jsonMedia = asRecord(content?.["application/json"]);
  const example =
    jsonMedia?.example !== undefined
      ? typeof jsonMedia.example === "string"
        ? jsonMedia.example
        : JSON.stringify(jsonMedia.example, null, 2)
      : "";
  const schema = asRecord(jsonMedia?.schema);
  return {
    response: {
      id: nextId("res"),
      status,
      description: asString(record.description) || status,
      exampleJson: example,
    },
    advanced: schema ? schemaHasAdvanced(schema) : false,
  };
};

/** Convierte un OpenAPI 3 JSON a draft editable (primer nivel). */
export const openApiToDraft = (document: unknown): OpenApiDraft => {
  const root = asRecord(document) ?? {};
  const info = asRecord(root.info) ?? {};
  const server = asRecord(Array.isArray(root.servers) ? root.servers[0] : null);
  const schemes = asRecord(asRecord(root.components)?.securitySchemes) ?? {};
  const bearerAuth = Object.values(schemes).some((scheme) => {
    const record = asRecord(scheme);
    return record?.scheme === "bearer" || record?.type === "oauth2";
  });

  let advancedWarning = false;
  const paths = asRecord(root.paths) ?? {};
  const operations: DraftOperation[] = [];

  for (const [path, rawItem] of Object.entries(paths)) {
    const pathItem = asRecord(rawItem) ?? {};
    for (const [method, rawOp] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.includes(method as DraftHttpMethod)) continue;
      const operation = asRecord(rawOp) ?? {};
      const requestBody = asRecord(operation.requestBody);
      const content = asRecord(requestBody?.content);
      const jsonMedia = asRecord(content?.["application/json"]);
      const bodySchema = asRecord(jsonMedia?.schema);
      const { fields, advanced: bodyAdvanced } = fieldsFromSchema(bodySchema);
      if (bodyAdvanced) advancedWarning = true;

      const responses = asRecord(operation.responses) ?? {};
      const statusKeys = Object.keys(responses);
      const successKey =
        statusKeys.find((key) => key.startsWith("2")) ?? statusKeys[0] ?? "200";
      const successParsed = responseFromOpenApi(
        successKey,
        responses[successKey],
      );
      if (successParsed.advanced) advancedWarning = true;

      const errors = statusKeys
        .filter((key) => key !== successKey)
        .map((key) => {
          const parsed = responseFromOpenApi(key, responses[key]);
          if (parsed.advanced) advancedWarning = true;
          return parsed.response;
        });

      operations.push({
        id: nextId("op"),
        method: method as DraftHttpMethod,
        path,
        summary: asString(operation.summary),
        description: asString(operation.description),
        bodyFields: fields,
        success: successParsed.response,
        errors,
      });
    }
  }

  return {
    title: asString(info.title),
    version: asString(info.version) || "1.0.0",
    description: asString(info.description),
    serverUrl: asString(server?.url),
    bearerAuth,
    operations,
    advancedWarning,
  };
};

const buildBodySchema = (
  fields: readonly DraftBodyField[],
): JsonRecord | null => {
  if (fields.length === 0) return null;
  const properties: JsonRecord = {};
  const required: string[] = [];
  const example: JsonRecord = {};

  for (const field of fields) {
    if (!field.name.trim()) continue;
    const prop: JsonRecord = { type: field.type };
    if (field.description.trim()) prop.description = field.description.trim();
    if (field.type === "array") {
      prop.items = { type: "string" };
    }
    const exampleValue = parseExampleValue(field.type, field.example);
    if (exampleValue !== undefined) {
      prop.example = exampleValue;
      example[field.name.trim()] = exampleValue;
    }
    properties[field.name.trim()] = prop;
    if (field.required) required.push(field.name.trim());
  }

  if (Object.keys(properties).length === 0) return null;

  const schema: JsonRecord = {
    type: "object",
    properties,
  };
  if (required.length > 0) schema.required = required;
  return { schema, example };
};

const buildResponseObject = (response: DraftResponse): JsonRecord => {
  const result: JsonRecord = {
    description: response.description.trim() || response.status,
  };
  const example = tryParseJson(response.exampleJson);
  if (example !== undefined) {
    result.content = {
      "application/json": {
        example,
      },
    };
  }
  return result;
};

/** Materializa el draft a un documento OpenAPI 3.0.3. */
export const draftToOpenApi = (draft: OpenApiDraft): JsonRecord => {
  const paths: JsonRecord = {};

  for (const operation of draft.operations) {
    const path = operation.path.trim() || "/";
    const method = operation.method;
    const pathItem = (asRecord(paths[path]) ?? {}) as JsonRecord;

    const op: JsonRecord = {};
    if (operation.summary.trim()) op.summary = operation.summary.trim();
    if (operation.description.trim()) {
      op.description = operation.description.trim();
    }

    const body = buildBodySchema(operation.bodyFields);
    if (body) {
      const media: JsonRecord = { schema: body.schema };
      if (
        body.example &&
        typeof body.example === "object" &&
        Object.keys(body.example as JsonRecord).length > 0
      ) {
        media.example = body.example;
      }
      op.requestBody = {
        required: true,
        content: {
          "application/json": media,
        },
      };
    }

    const responses: JsonRecord = {
      [operation.success.status.trim() || "200"]: buildResponseObject(
        operation.success,
      ),
    };
    for (const error of operation.errors) {
      const status = error.status.trim() || "400";
      responses[status] = buildResponseObject(error);
    }
    op.responses = responses;

    if (draft.bearerAuth) {
      op.security = [{ bearerAuth: [] }];
    }

    pathItem[method] = op;
    paths[path] = pathItem;
  }

  const doc: JsonRecord = {
    openapi: "3.0.3",
    info: {
      title: draft.title.trim() || "API",
      version: draft.version.trim() || "1.0.0",
      ...(draft.description.trim()
        ? { description: draft.description.trim() }
        : {}),
    },
    paths,
  };

  if (draft.serverUrl.trim()) {
    doc.servers = [{ url: draft.serverUrl.trim() }];
  }

  if (draft.bearerAuth) {
    doc.components = {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    };
    doc.security = [{ bearerAuth: [] }];
  }

  return doc;
};

/** Serializa el draft a JSON pretty para el editor. */
export const draftToEditorText = (draft: OpenApiDraft): string =>
  JSON.stringify(draftToOpenApi(draft), null, 2);

/** Intenta parsear texto del editor a objeto OpenAPI. */
export const parseOpenApiJsonText = (
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Sin especificación aún." };
  }
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return {
      ok: false,
      error:
        "Vista previa y Constructor requieren JSON. Pega JSON o usa el Constructor.",
    };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `JSON inválido: ${err.message}`
          : "JSON inválido.",
    };
  }
};

export { HTTP_METHODS };
