-- Usuario comercial de prueba sin credencial compartida/versionada.
-- Requiere haber corrido antes commercial_users.sql. Define la contraseña en
-- la MISMA sesión SQL, sin guardarla aquí ni en Git:
--   select set_config('zyteron.commercial_seed_password', '<secreto de 16-72 bytes>', false);
begin;

create extension if not exists pgcrypto;

do $$
declare
  seed_password text := current_setting('zyteron.commercial_seed_password', true);
begin
  if seed_password is null
     or seed_password <> btrim(seed_password)
     or octet_length(seed_password) not between 16 and 72 then
    raise exception 'Configura zyteron.commercial_seed_password con 16-72 bytes.';
  end if;
end $$;

insert into public.commercial_users
  (rut, name, email, phone, role, password_hash, status, commission_pct, must_change_password)
values
  ('21856124-1',
   'Zaray',
   null,
   null,
   'partner',
   crypt(current_setting('zyteron.commercial_seed_password'), gen_salt('bf', 12)),
   'active',
   0,
   true)
on conflict (rut) do update
  set password_hash = excluded.password_hash,
      status = 'active',
      must_change_password = true,
      updated_at = now();

commit;

select set_config('zyteron.commercial_seed_password', '', false);
