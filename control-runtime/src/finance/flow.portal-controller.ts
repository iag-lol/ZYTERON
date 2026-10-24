import { Body, Controller, Post, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/roles.decorator.js';
import { FlowFinanceService } from './flow.service.js';
const nonces=new Map<string,number>();
export function verifyPortalFlowBridge(request:{ip?:string;headers:Record<string,string|undefined>;rawBody?:Buffer},key=process.env.CONTROL_BRIDGE_KEY){
 const time=request.headers['x-zyteron-time']||'',nonce=request.headers['x-zyteron-nonce']||'',signature=request.headers['x-zyteron-signature']||'';
 if(!key||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.ip||'')||!/^[a-f0-9]{64}$/.test(signature)||!/^[a-f0-9-]{36}$/.test(nonce)||!/^\d{13}$/.test(time)||Math.abs(Date.now()-Number(time))>10000)throw new UnauthorizedException('Canal de pago inválido.');
 const expected=createHmac('sha256',key).update(`portal-invoice-flow\n${time}\n${nonce}\n`).update(request.rawBody||Buffer.alloc(0)).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw new UnauthorizedException('Canal de pago inválido.');
 for(const[n,until]of nonces)if(until<Date.now())nonces.delete(n);
 if(nonces.has(nonce))throw new UnauthorizedException('Intento repetido.');nonces.set(nonce,Date.now()+20000);
}
@Controller('internal/portal-invoice-flow')
export class FlowPortalInvoiceController {
 constructor(private readonly flow:FlowFinanceService){}
 @Post() @Public() async create(@Req()req:{ip?:string;headers:Record<string,string|undefined>;rawBody?:Buffer},@Body()body:unknown){
  verifyPortalFlowBridge(req);
  const b=body as Record<string,unknown>;
  if(!b||Object.keys(b).some(k=>!['userId','invoiceId','amount','key'].includes(k))||typeof b.userId!=='string'||b.userId.length>100||typeof b.invoiceId!=='string'||!/^[0-9a-f-]{36}$/i.test(b.invoiceId)||typeof b.amount!=='number'||!Number.isSafeInteger(b.amount)||b.amount<=0||typeof b.key!=='string'||!/^[0-9a-f-]{36}$/i.test(b.key))throw new BadRequestException('Revisa el documento y su importe.');
  return this.flow.portalStart(b.userId,b.invoiceId,b.amount,b.key);
 }
}
