import { createClient,type SupabaseClient } from "@supabase/supabase-js";
let client:SupabaseClient|undefined;
export function developmentAuth(){return process.env.NODE_ENV!=="production"&&process.env.NEXT_PUBLIC_AUTH_MODE==="development";}
export function browserSupabase(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return undefined;client??=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
export async function signInWithRut(rut:string,password:string){
  const client=browserSupabase();if(!client)throw new Error("El acceso empresarial no está disponible en este momento.");
  const response=await fetch("/api/equipo/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rut,password}),cache:"no-store"});
  const result=await response.json() as {error?:string;session?:{access_token:string;refresh_token:string}};
  if(!response.ok||!result.session)throw new Error(result.error||"RUT o contraseña incorrectos.");
  const{error}=await client.auth.setSession(result.session);if(error)throw new Error("No fue posible iniciar la sesión. Intenta nuevamente.");
}
