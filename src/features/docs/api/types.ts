export type DocsApiSummary = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  readonly updatedAt: string;
};

export type DocsCatalogResponse = {
  readonly data: readonly DocsApiSummary[];
};

export type DocsApiDetail = DocsApiSummary & {
  readonly audiences?: readonly string[];
};

export type DocsApiDetailResponse = {
  readonly data: DocsApiDetail;
};

export type DocsPublishResponse = {
  readonly data: {
    readonly apiId: string;
    readonly version: string;
    readonly updatedAt: string;
  };
};

export type DocsClientStatus = "pending" | "active" | "disabled";

export type DocsClient = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly status: DocsClientStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly activationUrl?: string;
};

export type DocsClientsListResponse = {
  readonly data: readonly DocsClient[];
};

export type DocsClientResponse = {
  readonly data: DocsClient;
};

export type DocsCreateApiPayload = {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly audiences: readonly string[];
  readonly file: File;
};

export type DocsCreateClientPayload = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
};

export type DocsErrorBody = {
  readonly message: string;
};
