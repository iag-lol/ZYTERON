import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { checkoutUrl, openToken, parseObservation, sealToken, signedParams } from './pilot-protocol';
import { samePaymentToken, verifyPaymentObservation } from './verified-payment';
import { createFlowPayment } from './flow';

const paid = { status: 2, flowOrder: 12345, commerceOrder: 'persisted-order', currency: 'CLP', amount: 1000, paymentData: { currency: 'CLP', amount: 1000, date: '2026-10-11 12:00:00' } };
const order = { id: 'persisted-order', amount: 1000, flowOrder: 12345, token: 'private-checkout-token' };

test('only matching persisted payment evidence permits approval', () => {
 assert.equal(verifyPaymentObservation(paid, order, order.token).status, 2);
 for (const mutation of [{commerceOrder:'different-order'}, {amount:999}, {currency:'USD'}, {flowOrder:12346}, {status:8}, {paymentData:undefined}, {paymentData:{...paid.paymentData,amount:999}}, {paymentData:{...paid.paymentData,date:'invalid-date'}}]) {
  assert.throws(()=>verifyPaymentObservation({...paid,...mutation},order,order.token));
 }
 assert.throws(()=>verifyPaymentObservation(paid,order,'wrong-token'));
 assert.throws(()=>verifyPaymentObservation(paid,{...order,flowOrder:null},order.token));
});
test('missing tokens never authorize access', () => {
 assert.equal(samePaymentToken(undefined, undefined), false);
 assert.equal(samePaymentToken(order.token, order.token), true);
 assert.equal(samePaymentToken(order.token, order.token+'x'), false);
});
test('test payment requires exact typed evidence and an unambiguous payment time', () => {
 const result=parseObservation(paid);
 assert.equal(result.paidAt,'2026-10-11T15:00:00Z');
 for(const mutation of [{status:'2'}, {flowOrder:'12345'}, {amount:'1000.01'}, {currency:'USD'}, {amount:1000.01}, {commerceOrder:''}, {paymentData:{...paid.paymentData,date:'not-a-date'}}, {paymentData:{...paid.paymentData,date:'2026-02-30 12:00:00'}}, {paymentData:{...paid.paymentData,date:'2026-09-06 00:30:00'}}]) {
  assert.throws(()=>parseObservation({...paid,...mutation}));
 }
});
test('pending, rejected and cancelled observations never contain payment evidence', () => {
 for(const [status,state] of [[1,'PENDING'],[3,'REJECTED'],[4,'CANCELLED']] as const){
  const observation=parseObservation({...paid,status,paymentData:undefined});
  assert.equal(observation.state,state);assert.equal(observation.paidAt,null);
 }
});
test('encrypted tokens are bound to their own payment and detect tampering', () => {
 const key=randomBytes(32).toString('hex'),value=sealToken(order.token,order.id,key);
 assert.equal(openToken(value,order.id,key),order.token);
 assert.throws(()=>openToken(value,'other-order',key));
 const changed=Buffer.from(value,'base64url');changed[14]^=1;
 assert.throws(()=>openToken(changed.toString('base64url'),order.id,key));
 assert.throws(()=>openToken(value,order.id,randomBytes(32).toString('hex')));
 assert.ok(!value.includes(order.token));
});
test('checkout cannot redirect tokens to alternate hosts or production', () => {
 assert.equal(new URL(checkoutUrl('https://sandbox.flow.cl/app/web/pay.php',order.token)).searchParams.get('token'),order.token);
 for(const url of ['https://www.flow.cl/app/web/pay.php','http://sandbox.flow.cl/pay','https://sandbox.flow.cl.evil.example/pay','https://sandbox.flow.cl:444/pay','https://user:pass@sandbox.flow.cl/pay','https://sandbox.flow.cl/pay?redirect=other','https://sandbox.flow.cl/pay#x'])assert.throws(()=>checkoutUrl(url,order.token));
});
test('request signature is stable regardless of property insertion order', () => {
 assert.equal(signedParams({commerceOrder:order.id,amount:'1000',apiKey:'test-key'},'test-secret'), signedParams({apiKey:'test-key',amount:'1000',commerceOrder:order.id},'test-secret'));
 assert.notEqual(signedParams({amount:'1000.01'},'test-secret'),signedParams({amount:'1001'},'test-secret'));
});
test('live payment creation stays closed until production is explicitly activated', async () => {
 const keys=['FLOW_API_KEY','FLOW_SECRET_KEY','FLOW_API_BASE','FLOW_USE_SANDBOX','FLOW_LIVE_PAYMENTS_ENABLED'] as const;
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 const originalFetch=globalThis.fetch;let requests=0;
 try {
  process.env.FLOW_API_KEY='test-api-key';process.env.FLOW_SECRET_KEY='test-secret';
  process.env.FLOW_API_BASE='https://www.flow.cl/api';delete process.env.FLOW_USE_SANDBOX;delete process.env.FLOW_LIVE_PAYMENTS_ENABLED;
  globalThis.fetch=async()=>{requests++;throw new Error('Network should not be called');};
  await assert.rejects(createFlowPayment({commerceOrder:order.id,subject:'test',amount:1000,email:'qa@example.invalid',urlConfirmation:'https://www.zyteron.cl/callback',urlReturn:'https://www.zyteron.cl/return'}),/cobros reales/);
  assert.equal(requests,0);
 } finally {globalThis.fetch=originalFetch;for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
