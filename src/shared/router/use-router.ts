import { useContext } from "react";
import { RouterContext, type RouterContextValue } from "./router-context-base";

export const useRouter = (): RouterContextValue => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter debe ser utilizado dentro de un RouterProvider");
  }
  return context;
};
