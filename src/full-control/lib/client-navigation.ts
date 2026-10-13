"use client";
import {usePathname as pathname,useRouter as router} from "next/navigation";
import {mountControlPath,controlPathname} from "./mount-path";
export {useParams,useSearchParams,useSelectedLayoutSegment,useSelectedLayoutSegments} from "next/navigation";
export function usePathname(){return controlPathname(pathname());}
export function useRouter(){const value=router();return {...value,push:(path:string,options?:Parameters<typeof value.push>[1])=>value.push(mountControlPath(path),options),replace:(path:string,options?:Parameters<typeof value.replace>[1])=>value.replace(mountControlPath(path),options),prefetch:(path:string,options?:Parameters<typeof value.prefetch>[1])=>value.prefetch(mountControlPath(path),options)};}
