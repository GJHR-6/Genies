-- =====================================================================
-- Catálogos (P8): listado de usuarios para la pantalla /catalogos/usuarios.
-- `perfiles` no guarda el correo; vive en auth.users, que el cliente no
-- puede leer. Esta función lo expone solo al admin.
-- =====================================================================

create or replace function admin_usuarios()
returns table (
  user_id         uuid,
  email           text,
  nombre          text,
  rol             rol_usuario,
  sucursal_id     smallint,
  ultimo_ingreso  timestamptz,
  creado          timestamptz
)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, p.nombre, p.rol, p.sucursal_id,
         u.last_sign_in_at, u.created_at
  from auth.users u
  left join perfiles p on p.user_id = u.id
  where es_admin()
  order by u.email
$$;

revoke all on function admin_usuarios() from public, anon;
grant execute on function admin_usuarios() to authenticated;
