import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
const used=new Map<string,number>();
export function nativeBridgeIdentity(request:{headers:Record<string,string|string[]|undefined>;ip?:string;method?:string;originalUrl?:string;rawBody?:Buffer}){
 const value=request.headers['x-zyteron-native-context'];if(value===undefined)return null;
 const key=process.env.CONTROL_BRIDGE_KEY;
 if(!key||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.ip??''))throw new UnauthorizedException('Canal interno inválido.');
 const signature=request.headers['x-zyteron-native-signature'];
 if(typeof value!=='string'||value.length>2048||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))throw new UnauthorizedException('Firma interna inválida.');
 const bodyHash=createHash('sha256').update(request.rawBody??Buffer.alloc(0)).digest('hex');
 const canonical=[request.method,request.originalUrl,bodyHash,value].join('\n');
 const expected=createHmac('sha256',key).update(canonical).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw new UnauthorizedException('Firma interna inválida.');
 let context:{role?:unknown;userId?:unknown;sessionId?:unknown;time?:unknown;nonce?:unknown};try{context=JSON.parse(Buffer.from(value,'base64url').toString())}catch{throw new UnauthorizedException('Contexto inválido.');}
 if(context.role!=='GERENTE_GENERAL'||typeof context.userId!=='string'||!/^[0-9a-f-]{36}$/.test(context.userId)||typeof context.sessionId!=='string'||!context.sessionId.startsWith('native:')||typeof context.time!=='number'||Math.abs(Date.now()-context.time)>10_000||typeof context.nonce!=='string'||!/^[0-9a-f-]{36}$/.test(context.nonce))throw new UnauthorizedException('Contexto interno vencido o inválido.');
 for(const [nonce,expires] of used)if(expires<Date.now())used.delete(nonce);
 if(used.has(context.nonce))throw new UnauthorizedException('Solicitud interna repetida.');used.set(context.nonce,Date.now()+20_000);
 return{role:context.role,userId:context.userId,sessionId:context.sessionId,aal:'aal1' as const};
}
