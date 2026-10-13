import {redirect as redirectNative,permanentRedirect as permanentNative} from "next/navigation";
import {mountControlPath} from "./mount-path";
export {notFound} from "next/navigation";
export function redirect(path:string):never{return redirectNative(mountControlPath(path));}
export function permanentRedirect(path:string):never{return permanentNative(mountControlPath(path));}
