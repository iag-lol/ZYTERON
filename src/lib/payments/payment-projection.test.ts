import {test} from 'node:test';import assert from 'node:assert/strict';import {projectMonthlyPayments} from './payment-projection';
const subscription={quoteId:'q',label:'Mantención',amount:1000,nextDate:'2026-01-31',activatedAt:null,state:'ACTIVE',paidThrough:'2026-02-28'};
test('monthly projection preserves civil anchor and clamps February',()=>{assert.deepEqual(projectMonthlyPayments(subscription,2026).slice(0,3).map(p=>p.date),['2026-01-31','2026-02-28','2026-03-31']);});
test('cancellation stops projecting beyond paid coverage and cancelled plans have no forecasts',()=>{assert.deepEqual(projectMonthlyPayments({...subscription,state:'CANCEL_REQUESTED'},2026).map(p=>p.date),['2026-01-31','2026-02-28']);assert.deepEqual(projectMonthlyPayments({...subscription,state:'CANCELLED'},2026),[]);assert.deepEqual(projectMonthlyPayments({...subscription,state:'CANCEL_REQUESTED',paidThrough:null},2026),[]);});

test('paid coverage is evaluated on the Chilean calendar before forecasting another charge',()=>{assert.deepEqual(projectMonthlyPayments({...subscription,nextDate:'2026-11-01',state:'CANCEL_REQUESTED',paidThrough:'2026-11-01T02:59:59Z'},2026),[]);});
