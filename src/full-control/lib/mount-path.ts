export const controlBase = "/administracion";
export function mountControlPath(path:string){
 if(!path.startsWith("/")||path.startsWith("//")||path.startsWith("/api/")||path===controlBase||path.startsWith(controlBase+"/"))return path;
 return controlBase+(path==="/"?"":path);
}
export function controlPathname(path:string){return path===controlBase?"/":path.startsWith(controlBase+"/")?path.slice(controlBase.length):path;}
