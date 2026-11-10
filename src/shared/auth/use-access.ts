import { useContext } from "react";
import { AccessContext, type AccessContextValue } from "./access-context-base";

export const useAccess = (): AccessContextValue => useContext(AccessContext);
