import { HrWorkspace } from "@control/components/hr/hr-workspace";
import "@control/styles/hr.css";
export default async function Page({params}:{params:Promise<{segments?:string[]}>}){const{segments=[]}=await params;return <HrWorkspace segments={segments}/>;}
