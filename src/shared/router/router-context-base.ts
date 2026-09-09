import { createContext } from "react";

export interface RouterContextValue {
  readonly path: string;
  readonly navigate: (to: string, replace?: boolean) => void;
}

export const RouterContext = createContext<RouterContextValue | null>(null);
