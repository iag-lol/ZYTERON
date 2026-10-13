type Env=Record<string,string|undefined>;
/** Business ledgers cannot receive test money. The isolated pilot has its own provider and tables. */
export function assertBusinessPaymentEnvironment(base:string,env:Env=process.env){
 if(base!=='https://sandbox.flow.cl/api')return;
 let local=false;try{const db=new URL(env.DATABASE_URL||'');local=['localhost','127.0.0.1','[::1]'].includes(db.hostname);}catch{/* Missing identity is not an isolated test database. */}
 if(!local)throw new Error('Los pagos de prueba requieren una base aislada y no pueden abonar obligaciones reales.');
}
