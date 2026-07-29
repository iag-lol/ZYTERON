-- Usuario comercial de prueba: RUT 21.856.124-1 · contraseña Zaray2026.,
-- Requiere haber corrido antes commercial_users.sql. Idempotente.
insert into public.commercial_users
  (rut, name, email, phone, role, password_hash, status, commission_pct, must_change_password)
values
  ('21856124-1',
   'Zaray',
   null,
   null,
   'partner',
   '$2b$10$XyVX1ayJ5SJXYVIroXdqueQ2vZQwbmgkjolan3HO9K0.oRUMeUZdC',
   'active',
   0,
   false)
on conflict (rut) do update
  set password_hash = excluded.password_hash,
      status = 'active',
      updated_at = now();
