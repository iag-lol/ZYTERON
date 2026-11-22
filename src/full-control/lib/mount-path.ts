export const controlBase = "/administracion";
export function mountControlPath(path:string){
 if(typeof window!=="undefined"&&(window.location.pathname==="/equipo"||window.location.pathname.startsWith("/equipo/"))){if(path==="/equipo"||path.startsWith("/equipo/"))return path;if(path.startsWith(controlBase+"/"))path=path.slice(controlBase.length);if(path.startsWith("/")&&!path.startsWith("//")&&!path.startsWith("/api/"))return "/equipo"+(path==="/"?"":path);}
 if(!path.startsWith("/")||path.startsWith("//")||path.startsWith("/api/")||path===controlBase||path.startsWith(controlBase+"/"))return path;
 return controlBase+(path==="/"?"":path);
}
export function controlPathname(path:string){if(path==="/equipo")return "/";if(path.startsWith("/equipo/"))return path.slice("/equipo".length);return path===controlBase?"/":path.startsWith(controlBase+"/")?path.slice(controlBase.length):path;}
