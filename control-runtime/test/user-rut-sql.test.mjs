import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('la base protege RUT único, identidad única y acceso exclusivo del servidor',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);`);
    const sql=readFileSync(new URL('../../supabase/migrations/20261122063000_control_user_login_ruts.sql',import.meta.url),'utf8');
    await db.exec(sql);await db.exec(sql);
    await db.exec(`INSERT INTO auth.users VALUES('10000000-0000-4000-8000-000000000001');INSERT INTO control_user_login_ruts(rut,user_id) VALUES('12345678-5','10000000-0000-4000-8000-000000000001');`);
    await assert.rejects(db.exec(`INSERT INTO control_user_login_ruts(rut) VALUES('12345678-5')`),/unique/);
    await assert.rejects(db.exec(`INSERT INTO control_user_login_ruts(rut,user_id) VALUES('11111111-1','10000000-0000-4000-8000-000000000001')`),/unique/);
    const {rows}=await db.query(`SELECT has_table_privilege('anon','control_user_login_ruts','SELECT') AS anon,has_table_privilege('authenticated','control_user_login_ruts','SELECT') AS authenticated,relrowsecurity FROM pg_class WHERE oid='control_user_login_ruts'::regclass`);
    assert.deepEqual(rows[0],{anon:false,authenticated:false,relrowsecurity:true});
    await db.exec(`DELETE FROM auth.users;`);assert.equal((await db.query(`SELECT count(*)::int AS count FROM control_user_login_ruts`)).rows[0].count,0);
  }finally{await db.close();}
});
