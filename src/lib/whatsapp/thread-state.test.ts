import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeThreadMessages,nearThreadBottom,threadAnchorTop} from './thread-state';
const msg=(id:string,content=id,time=id)=>({id,content,direction:'in',created_at:new Date(Date.UTC(2026,9,21,0,0,Number(time)||0)).toISOString()});
test('polling conserva los mensajes anteriores cargados y actualiza estados sin duplicar',()=>{
 const history=Array.from({length:150},(_,i)=>({...msg(String(i).padStart(3,'0')),status:'sent'}));
 const refreshed=history.slice(-100).map(m=>({...m,status:'read'}));
 const merged=mergeThreadMessages(history,refreshed);
 assert.equal(merged.length,150);assert.equal(merged[0]?.id,'000');assert.equal(merged.at(-1)?.status,'read');
});
test('conserva mensajes distintos con el mismo texto y elimina solamente el temporal equivalente',()=>{
 const previous=[msg('old','Hola','001'),msg('temp-1','Hola','002')];
 const merged=mergeThreadMessages(previous,[msg('new','Hola','003')]);
 assert.deepEqual(merged.map(m=>m.id),['old','new']);
});
test('leer arriba no activa seguimiento automático; cargar historial conserva el ancla',()=>{
 assert.equal(nearThreadBottom(150,3000,600),false);assert.equal(nearThreadBottom(2380,3000,600),true);
 assert.equal(threadAnchorTop(175,3000,4800),1975);
});
