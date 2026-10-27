const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
] as const;

type JsonRecord = Record<string, unknown>;

export type FieldRow = {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly validations: string;
  readonly description: string;
};

export type FieldSection = {
  readonly title: string;
  readonly rows: readonly FieldRow[];
};

export type HeaderRow = {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
};

export type ErrorView = {
  readonly status: string;
  readonly description: string;
  readonly json: string | null;
};

export type OperationView = {
  readonly id: string;
  readonly method: string;
  readonly path: string;
  readonly summary: string;
  readonly description: string;
  readonly headers: readonly HeaderRow[];
  readonly bodyExample: string | null;
  readonly bodySections: readonly FieldSection[];
  readonly successStatus: string | null;
  readonly successExample: string | null;
  readonly successSections: readonly FieldSection[];
  readonly errors: readonly ErrorView[];
  readonly curl: string;
  readonly usesBearer: boolean;
};

export type AuthView = {
  readonly description: string;
  readonly curl: string | null;
  readonly bearerHint: string | null;
};

export type OpenApiDocumentView = {
  readonly title: string;
  readonly version: string | null;
  readonly description: string | null;
  readonly serverUrl: string | null;
  readonly auth: AuthView | null;
  readonly operations: readonly OperationView[];
};

const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const isMethod = (key: string): boolean =>
  HTTP_METHODS.includes(key.toLowerCase() as (typeof HTTP_METHODS)[number]);

const slug = (method: string, path: string): string =>
  `${method}-${path}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

const resolveRef = (root: JsonRecord, schema: JsonRecord): JsonRecord => {
  const ref = asString(schema.$ref);
  if (!ref?.startsWith("#/")) return schema;
  const node = ref
    .slice(2)
    .split("/")
    .reduce<unknown>((current, part) => asRecord(current)?.[part], root);
  return asRecord(node) ?? schema;
};

const schemaType = (schema: JsonRecord): string => {
  const type = asString(schema.type);
  if (type === "array") {
    const items = asRecord(schema.items);
    return items ? `${schemaType(items)}[]` : "array";
  }
  if (type) return type;
  if (schema.properties) return "object";
  return "object";
};

const validationsOf = (schema: JsonRecord): string => {
  const parts: string[] = [];
  if (typeof schema.minLength === "number") {
    parts.push(`mínimo ${schema.minLength} caracteres`);
  }
  if (typeof schema.maxLength === "number") {
    parts.push(`máximo ${schema.maxLength} caracteres`);
  }
  if (typeof schema.minimum === "number")
    parts.push(`mínimo ${schema.minimum}`);
  if (typeof schema.maximum === "number")
    parts.push(`máximo ${schema.maximum}`);
  if (Array.isArray(schema.enum))
    parts.push(`valores: ${schema.enum.join(", ")}`);
  if (typeof schema.pattern === "string")
    parts.push(`patrón ${schema.pattern}`);
  if (typeof schema.format === "string") parts.push(schema.format);
  return parts.join(". ");
};

const sectionsFromSchema = (
  root: JsonRecord,
  schema: JsonRecord,
  title: string,
  seen: ReadonlySet<string>,
): FieldSection[] => {
  const resolved = resolveRef(root, schema);
  const ref = asString(schema.$ref);
  if (ref && seen.has(ref)) return [];
  const nextSeen = ref ? new Set([...seen, ref]) : seen;
  if (schemaType(resolved) === "array" || resolved.type === "array") {
    const items = asRecord(resolved.items);
    return items ? sectionsFromSchema(root, items, title, nextSeen) : [];
  }
  const properties = asRecord(resolved.properties);
  if (!properties) return [];
  const required = new Set(
    Array.isArray(resolved.required)
      ? resolved.required.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );
  const rows: FieldRow[] = [];
  const nested: FieldSection[] = [];
  for (const [name, raw] of Object.entries(properties)) {
    const property = resolveRef(root, asRecord(raw) ?? {});
    const type = schemaType(property);
    if (property.type === "object" || (property.properties && !property.type)) {
      nested.push(...sectionsFromSchema(root, property, name, nextSeen));
      rows.push({
        name,
        type: "object",
        required: required.has(name),
        validations: "",
        description: asString(property.description) ?? "Objeto anidado",
      });
      continue;
    }
    if (property.type === "array") {
      const items = asRecord(property.items);
      if (
        items &&
        (items.type === "object" || items.properties || items.$ref)
      ) {
        nested.push(...sectionsFromSchema(root, items, `${name}[]`, nextSeen));
      }
    }
    rows.push({
      name,
      type,
      required: required.has(name),
      validations: validationsOf(property),
      description: asString(property.description) ?? "",
    });
  }
  return [{ title, rows }, ...nested];
};

const exampleOf = (media: JsonRecord): unknown => {
  if ("example" in media) return media.example;
  const examples = asRecord(media.examples);
  const first = examples ? Object.values(examples)[0] : null;
  const wrapped = asRecord(first);
  if (wrapped && "value" in wrapped) return wrapped.value;
  const schema = asRecord(media.schema);
  if (schema && "example" in schema) return schema.example;
  return null;
};

const jsonText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const firstContent = (
  body: JsonRecord | null,
): { readonly mime: string; readonly media: JsonRecord } | null => {
  const content = asRecord(body?.content);
  if (!content) return null;
  const preferred =
    asRecord(content["application/json"]) ??
    asRecord(content["application/x-www-form-urlencoded"]) ??
    asRecord(Object.values(content)[0]);
  if (!preferred) return null;
  const mime =
    Object.keys(content).find((key) => asRecord(content[key]) === preferred) ??
    "application/json";
  return { mime, media: preferred };
};

const parameterList = (
  root: JsonRecord,
  pathItem: JsonRecord,
  operation: JsonRecord,
): JsonRecord[] => {
  const shared = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
  const own = Array.isArray(operation.parameters) ? operation.parameters : [];
  return [...shared, ...own]
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => item !== null)
    .map((item) => resolveRef(root, item));
};

const usesBearer = (root: JsonRecord, operation: JsonRecord): boolean => {
  const security = Array.isArray(operation.security)
    ? operation.security
    : Array.isArray(root.security)
      ? root.security
      : [];
  return security.some((entry) => {
    const record = asRecord(entry);
    if (!record) return false;
    return Object.keys(record).some((name) => {
      const scheme = asRecord(
        asRecord(asRecord(root.components)?.securitySchemes)?.[name],
      );
      return scheme?.scheme === "bearer" || scheme?.type === "oauth2";
    });
  });
};

const usesBasic = (root: JsonRecord, operation: JsonRecord): boolean => {
  const security = Array.isArray(operation.security) ? operation.security : [];
  return security.some((entry) => {
    const record = asRecord(entry);
    if (!record) return false;
    return Object.keys(record).some((name) => {
      const scheme = asRecord(
        asRecord(asRecord(root.components)?.securitySchemes)?.[name],
      );
      return scheme?.scheme === "basic";
    });
  });
};

const buildCurl = (input: {
  readonly serverUrl: string;
  readonly method: string;
  readonly path: string;
  readonly mime: string | null;
  readonly example: unknown;
  readonly bearer: boolean;
  readonly basic: boolean;
}): string => {
  const lines = [
    `curl --location --request ${input.method.toUpperCase()} '${input.serverUrl}${input.path}'`,
  ];
  if (input.basic) {
    lines.push("--header 'Authorization: Basic <credenciales_base64>'");
  }
  if (input.bearer) lines.push("--header 'Authorization: Bearer <token>'");
  if (input.mime) lines.push(`--header 'Content-Type: ${input.mime}'`);
  if (
    input.mime === "application/x-www-form-urlencoded" &&
    asRecord(input.example)
  ) {
    for (const [key, value] of Object.entries(asRecord(input.example) ?? {})) {
      lines.push(`--data-urlencode '${key}=${String(value)}'`);
    }
  } else if (
    input.example !== null &&
    input.example !== undefined &&
    input.mime
  ) {
    const body = JSON.stringify(input.example);
    lines.push(`--data '${body}'`);
  }
  return lines.join(" \\\n");
};

const responseView = (
  root: JsonRecord,
  responses: JsonRecord,
  success: boolean,
): {
  readonly status: string;
  readonly description: string;
  readonly json: string | null;
  readonly sections: FieldSection[];
}[] =>
  Object.entries(responses)
    .filter(([status]) =>
      success ? status.startsWith("2") : Number(status) >= 400,
    )
    .map(([status, raw]) => {
      const response = resolveRef(root, asRecord(raw) ?? {});
      const content = firstContent(response);
      const schema = asRecord(content?.media.schema);
      return {
        status,
        description: asString(response.description) ?? "",
        json: jsonText(exampleOf(content?.media ?? {})),
        sections: schema
          ? sectionsFromSchema(
              root,
              schema,
              "Estructura de la respuesta",
              new Set(),
            )
          : [],
      };
    });

const operationView = (
  root: JsonRecord,
  path: string,
  method: string,
  pathItem: JsonRecord,
  operation: JsonRecord,
  serverUrl: string,
): OperationView => {
  const parameters = parameterList(root, pathItem, operation);
  const body = firstContent(asRecord(operation.requestBody));
  const bearer = usesBearer(root, operation);
  const headers: HeaderRow[] = parameters
    .filter((parameter) => parameter.in === "header")
    .map((parameter) => ({
      name: asString(parameter.name) ?? "header",
      type: schemaType(asRecord(parameter.schema) ?? { type: "string" }),
      required: parameter.required === true,
      description: asString(parameter.description) ?? "",
    }));
  if (
    bearer &&
    !headers.some((header) => header.name.toLowerCase() === "authorization")
  ) {
    headers.unshift({
      name: "Authorization",
      type: "string",
      required: true,
      description: "Token Bearer para autenticación",
    });
  }
  if (
    body &&
    !headers.some((header) => header.name.toLowerCase() === "content-type")
  ) {
    headers.push({
      name: "Content-Type",
      type: "string",
      required: true,
      description: body.mime,
    });
  }
  const example = body ? exampleOf(body.media) : null;
  const bodySchema = asRecord(body?.media.schema);
  const responses = asRecord(operation.responses) ?? {};
  const successes = responseView(root, responses, true);
  const success = successes[0] ?? null;
  return {
    id: slug(method, path),
    method: method.toUpperCase(),
    path,
    summary: asString(operation.summary) ?? `${method.toUpperCase()} ${path}`,
    description: asString(operation.description) ?? "",
    headers,
    bodyExample: jsonText(example),
    bodySections: bodySchema
      ? sectionsFromSchema(root, bodySchema, "Nivel raíz", new Set())
      : [],
    successStatus: success?.status ?? null,
    successExample: success?.json ?? null,
    successSections: success?.sections ?? [],
    errors: responseView(root, responses, false).map((error) => ({
      status: error.status,
      description: error.description,
      json: error.json,
    })),
    curl: buildCurl({
      serverUrl,
      method,
      path,
      mime: body?.mime ?? null,
      example,
      bearer,
      basic: usesBasic(root, operation),
    }),
    usesBearer: bearer,
  };
};

const authView = (
  root: JsonRecord,
  operations: readonly OperationView[],
): AuthView | null => {
  const schemes = asRecord(asRecord(root.components)?.securitySchemes) ?? {};
  const hasBearer = Object.values(schemes).some((scheme) => {
    const record = asRecord(scheme);
    return record?.scheme === "bearer" || record?.type === "oauth2";
  });
  const tokenOperation = operations.find(
    (operation) =>
      operation.method === "POST" && /token|oauth/i.test(operation.path),
  );
  if (!hasBearer && !tokenOperation) return null;
  return {
    description: tokenOperation
      ? "Obtén un token con client credentials y envíalo como Bearer en el resto de operaciones."
      : "Las operaciones protegidas exigen Authorization: Bearer <token>.",
    curl: tokenOperation?.curl ?? null,
    bearerHint: hasBearer ? "Authorization: Bearer <token>" : null,
  };
};

/** Normaliza un OpenAPI 3 a las secciones del documento de integración. */
export const buildOpenApiDocument = (
  document: unknown,
): OpenApiDocumentView => {
  const root = asRecord(document) ?? {};
  const info = asRecord(root.info);
  const server = asRecord(Array.isArray(root.servers) ? root.servers[0] : null);
  const serverUrl = asString(server?.url) ?? "";
  const paths = asRecord(root.paths) ?? {};
  const operations = Object.entries(paths).flatMap(([path, rawItem]) => {
    const pathItem = asRecord(rawItem) ?? {};
    return Object.entries(pathItem)
      .filter(([key]) => isMethod(key))
      .map(([method, rawOperation]) =>
        operationView(
          root,
          path,
          method,
          pathItem,
          asRecord(rawOperation) ?? {},
          serverUrl,
        ),
      );
  });
  return {
    title: asString(info?.title) ?? "OpenAPI",
    version: asString(info?.version),
    description: asString(info?.description),
    serverUrl: serverUrl || null,
    auth: authView(root, operations),
    operations,
  };
};

/** Sustituye el placeholder del cURL cuando hay un token en memoria. */
export const curlWithToken = (curl: string, token: string): string => {
  const value = token.trim();
  if (!value) return curl;
  return curl.replaceAll("<token>", value);
};
