import type { LogEnvironment } from "./api/logs-types";

export interface LogsGcpTarget {
  readonly workload: string;
  readonly namespace: string;
  readonly cluster: string;
  readonly env: LogEnvironment | string;
  readonly location?: string;
  readonly project?: string;
}

const DEFAULT_PROJECT_BY_ENV: Record<string, string> = {
  prod: "cm-cluster-coordinadora-prod",
  test: "cm-cluster-coordinadora-test",
};

const DEFAULT_GKE_LOCATION = "us-central1";

/** Resuelve el ID del proyecto de GCP a partir del target o del ambiente. */
export const resolveGcpProject = (target: LogsGcpTarget): string =>
  target.project?.trim() ||
  DEFAULT_PROJECT_BY_ENV[target.env] ||
  DEFAULT_PROJECT_BY_ENV.test;

/** Resuelve la ubicación GKE del clúster. */
export const resolveGcpLocation = (target: LogsGcpTarget): string =>
  target.location?.trim() || DEFAULT_GKE_LOCATION;

/** Construye la URL directa al Deployment en Google Kubernetes Engine Console. */
export const buildGkeWorkloadUrl = (target: LogsGcpTarget): string => {
  const project = resolveGcpProject(target);
  const location = resolveGcpLocation(target);
  return `https://console.cloud.google.com/kubernetes/deployment/${encodeURIComponent(location)}/${encodeURIComponent(target.cluster)}/${encodeURIComponent(target.namespace)}/${encodeURIComponent(target.workload)}/overview?project=${encodeURIComponent(project)}`;
};

/** Construye la URL de Cloud Logging (Logs Explorer) filtrada por clúster, namespace y carga. */
export const buildGcpLogsExplorerUrl = (target: LogsGcpTarget): string => {
  const project = resolveGcpProject(target);
  const query = [
    'resource.type="k8s_container"',
    `resource.labels.cluster_name="${target.cluster}"`,
    `resource.labels.namespace_name="${target.namespace}"`,
    `resource.labels.pod_name:"${target.workload}"`,
  ].join("\n");
  return `https://console.cloud.google.com/logs/query;query=${encodeURIComponent(query)}?project=${encodeURIComponent(project)}`;
};
