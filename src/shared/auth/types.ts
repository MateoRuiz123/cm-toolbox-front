export type EstadoAuth =
  | "inicializando"
  | "sin_sesion"
  | "sin_acceso"
  | "error"
  | "autenticado";

export type CodigoErrorAuth =
  | "cookies_bloqueadas"
  | "red_o_cors"
  | "configuracion"
  | "desconocido";

export interface DetalleErrorAuth {
  codigo: CodigoErrorAuth;
  titulo: string;
  descripcion: string;
  sugerencias: string[];
  detalleTecnico?: string;
}

export interface SesionCorporativa {
  estadoAuth: EstadoAuth;
  email: string;
  terminal: string | number;
  errorAuth: DetalleErrorAuth | null;
  cerrarSesion: () => void;
  iniciarSesion: () => Promise<void>;
  reintentar: () => void;
}
