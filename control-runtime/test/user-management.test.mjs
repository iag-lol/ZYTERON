import test from 'node:test';
import assert from 'node:assert/strict';
import {SecurityService} from '../dist/security/security.service.js';
import {SecurityController} from '../dist/security/security.controller.js';
import {OrganizationController} from '../dist/hr/hr.controller.js';
import {RoleGuard} from '../dist/auth/role.guard.js';
import {Reflector} from '@nestjs/core';

const actor={userId:'10000000-0000-4000-8000-000000000001',role:'GERENTE_GENERAL',aal:'aal1',sessionId:'native:test',requestId:'test'};
const position='20000000-0000-4000-8000-000000000001';
const input={name:'Ejecutiva de prueba',email:'ventas@example.test',role:'EJECUTIVA_VENTAS',jobPositionId:position};
function setup({existing=[],inviteError=null,updateError=null,configured=[]}={}){
  const calls=[],audits=[];
  const admin={
    async createUser(value){calls.push(['create',value]);return{data:{user:{id:'new-user'}},error:null};},
    async listUsers({page}){calls.push(['list',page]);return{data:{users:page===1?existing:[]},error:null};},
    async inviteUserByEmail(email,options){calls.push(['invite',email,options]);return{data:{user:{id:'new-user',app_metadata:{provider:'email'}}},error:inviteError};},
    async updateUserById(id,value){calls.push(['update',id,value]);return{data:{user:{id,...value}},error:updateError};},
    async getUserById(id){return{data:{user:{id,app_metadata:{role:'EJECUTIVA_VENTAS',provider:'email'},user_metadata:{other:'preserved'}}},error:null};},
  };
  const repository={supabase:{auth:{admin}},async setting(){return configured;},async list(){return[{id:position,name:'Ejecutiva de ventas',active:true}];},async get(){return{active:true};},async create(table,value){audits.push([table,value]);return value;}};
  const service=new SecurityService(repository,{},{});
  return{service,calls,audits,repository};
}
test('el alta invita sin contraseñas y asigna únicamente el rol solicitado con cargo canónico',async()=>{
  const{service,calls,audits}=setup();
  const result=await service.createUser({...input,email:' Ventas@Example.test '},actor);
  assert.equal(result.role,'EJECUTIVA_VENTAS');
  const invite=calls.find(([type])=>type==='invite');
  assert.equal(invite[1],'ventas@example.test');
  assert.equal(new URL(invite[2].redirectTo).pathname,'/equipo');
  assert.deepEqual(invite[2].data,{full_name:input.name});
  assert.deepEqual(calls.find(([type])=>type==='update')[2].app_metadata,{provider:'email',role:'EJECUTIVA_VENTAS',job_position_id:position});
  assert.equal(audits[0][1].action,'USER_INVITED');
  assert.equal(JSON.stringify(audits).includes('password'),false);
});
test('el alta directa habilita la cuenta sin enviar correo y no devuelve ni audita la contraseña',async()=>{
  const{service,calls,audits}=setup();const password='InitialTestPassword9';
  const result=await service.createUser({...input,mode:'password',password},actor);
  assert.equal(result.invitationStatus,'NOT_REQUESTED');assert.equal(calls.some(([type])=>type==='invite'),false);
  const create=calls.find(([type])=>type==='create')[1];assert.equal(create.email_confirm,true);assert.equal(create.app_metadata.role,'EJECUTIVA_VENTAS');
  assert.equal(JSON.stringify(result).includes(password),false);assert.equal(JSON.stringify(audits).includes(password),false);
  const invalid=setup();await assert.rejects(invalid.service.createUser({...input,mode:'password',password:'weak'},actor),/contraseña inicial/);assert.equal(invalid.calls.some(([type])=>type==='create'||type==='invite'),false);
});
test('ventas y RRHH no pueden crear cuentas ni asignar privilegios administrativos',async()=>{
  for(const role of ['EJECUTIVA_VENTAS','RRHH','PORTAL_CLIENT']){
    const{service,calls}=setup();await assert.rejects(service.createUser(input,{...actor,role}),/administración de seguridad/);assert.equal(calls.length,0);
  }
  for(const role of ['GERENTE_GENERAL','SECURITY_ADMIN','PORTAL_CLIENT','FINANZAS']){
    const{service,calls}=setup({configured:['FINANZAS']});await assert.rejects(service.createUser({...input,role},actor),/rol interno/);assert.equal(calls.length,0);
  }
});
test('un correo existente no recibe otra invitación ni un cambio de rol',async()=>{
  const{service,calls}=setup({existing:[{email:'VENTAS@example.test',app_metadata:{role:'GERENTE_GENERAL'}}]});
  await assert.rejects(service.createUser(input,actor),/Ya existe/);
  assert.equal(calls.some(([type])=>type==='invite'||type==='update'),false);
});
test('correo o cargo inválidos se rechazan antes de invitar',async()=>{
  for(const change of [{email:'no-es-correo'},{jobPositionId:'no-es-uuid'},{name:' '}]){
    const{service,calls}=setup();await assert.rejects(service.createUser({...input,...change},actor));assert.equal(calls.some(([type])=>type==='invite'),false);
  }
  const{service,repository,calls}=setup();repository.get=async()=>({active:false});await assert.rejects(service.createUser(input,actor),/inactivo/);assert.equal(calls.length,0);
});
test('fallo del correo no asigna acceso y fallo del rol informa estado parcial',async()=>{
  const failedMail=setup({inviteError:{code:'email_rate_limit_exceeded'}});await assert.rejects(failedMail.service.createUser(input,actor),/No fue posible enviar/);assert.equal(failedMail.calls.some(([type])=>type==='update'),false);
  const failedRole=setup({updateError:new Error('Auth unavailable')});await assert.rejects(failedRole.service.createUser(input,actor),/permanece sin acceso/);assert.equal(failedRole.audits[0][1].result,'FAILED');
});
test('editar nombre y cargo conserva metadatos y no permite cambiar el rol por esa vía',async()=>{
  const{service,calls}=setup();await service.updateUserProfile('user',{name:'Nombre actualizado',jobPositionId:position},actor);
  const update=calls.find(([type])=>type==='update')[2];assert.equal(update.app_metadata.role,'EJECUTIVA_VENTAS');assert.equal(update.user_metadata.other,'preserved');assert.equal(update.user_metadata.full_name,'Nombre actualizado');
  await assert.rejects(service.updateUserProfile('user',{...input,role:'GERENTE_GENERAL'},actor),/MFA/);
});
test('el guard real rechaza altas de usuarios desde ventas y admite el catálogo de cargos solo a Gerencia y RRHH',async()=>{
  const beforeMode=process.env.AUTH_MODE,beforeNode=process.env.NODE_ENV;
  process.env.AUTH_MODE='development';process.env.NODE_ENV='test';
  try{
    const guard=new RoleGuard(new Reflector(),{async hasPermissions(){return true;},async observe(){return true;}});
    function context(controller,method,role){return{getClass:()=>controller,getHandler:()=>controller.prototype[method],switchToHttp:()=>({getRequest:()=>({headers:{'x-zyteron-role':role}})})};}
    await assert.rejects(guard.canActivate(context(SecurityController,'createUser','EJECUTIVA_VENTAS')),/rol no autoriza/);
    await assert.rejects(guard.canActivate(context(OrganizationController,'position','EJECUTIVA_VENTAS')),/rol no autoriza/);
    assert.equal(await guard.canActivate(context(OrganizationController,'position','GERENTE_GENERAL')),true);
    assert.equal(await guard.canActivate(context(OrganizationController,'position','RRHH')),true);
  }finally{if(beforeMode===undefined)delete process.env.AUTH_MODE;else process.env.AUTH_MODE=beforeMode;if(beforeNode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=beforeNode;}
});
