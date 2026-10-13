"use client";
import { Search } from "lucide-react";
export function FilterBar({placeholder="Buscar registros",value="",onChange}:{placeholder?:string;value?:string;onChange?:(value:string)=>void}){
 return <div className="filterBar"><label><Search size={15}/><input aria-label={placeholder} placeholder={placeholder} value={value} disabled={!onChange} onChange={e=>onChange?.(e.target.value)}/></label></div>;
}
