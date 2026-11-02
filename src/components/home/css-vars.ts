import type { CSSProperties } from "react";

/** Variables CSS inline tipadas (`--i`, `--d`, etc.) para las escenas de la portada. */
export const cssVars = (vars: Record<`--${string}`, string | number>) => vars as CSSProperties;
