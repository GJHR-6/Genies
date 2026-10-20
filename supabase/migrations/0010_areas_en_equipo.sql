-- =====================================================================
-- Áreas que trabajan en equipo (reunión con la dueña, 16 oct 2026)
--
-- Kenia y Dany no se reparten 50/50: una bate y la otra hornea, y si
-- falta una, la otra hace todo. Quiere una sola hoja "Kenia y Dany" y que
-- ellas se compaginen. Un área "en equipo" no se divide: el reparto queda
-- a nombre de la titular (primera pastelera activa del área por orden) y
-- cualquiera del equipo lo ve y marca su avance en la tablet de cocina.
-- =====================================================================

begin;

alter table areas_produccion
  add column trabajo_en_equipo boolean not null default false;

comment on column areas_produccion.trabajo_en_equipo is
  'true = el reparto del área no se divide por porcentaje: una hoja compartida para todas sus pasteleras';

update areas_produccion set trabajo_en_equipo = true
where nombre = 'Producción 1';

-- registrar_avance acepta quién está marcando (p_pastelera). Si no es la
-- dueña de la asignación, tiene que ser del mismo equipo (misma área en
-- equipo, ambas activas). El PIN que se valida es el de quien marca.
drop function if exists registrar_avance(bigint, text, integer, text);

create or replace function registrar_avance(
  p_asignacion bigint, p_pin text, p_hecha integer,
  p_estado text default null, p_pastelera smallint default null)
returns asignaciones
language plpgsql security definer set search_path = public as $$
declare
  v_asig   asignaciones;
  v_quien  smallint;
  v_hecha  integer;
  v_estado text;
begin
  if not (es_admin() or rol_actual() = 'principal') then
    raise exception 'Sin permiso';
  end if;

  select * into v_asig from asignaciones where id = p_asignacion for update;
  if not found then
    raise exception 'Asignación no encontrada';
  end if;

  if not es_admin() then
    if v_asig.pastelera_id is null then
      raise exception 'PIN incorrecto';
    end if;
    v_quien := coalesce(p_pastelera, v_asig.pastelera_id);
    if v_quien <> v_asig.pastelera_id and not exists (
      select 1
      from pasteleras quien
      join pasteleras duena on duena.id = v_asig.pastelera_id
      join areas_produccion a on a.id = quien.area_id
      where quien.id = v_quien
        and quien.activa
        and quien.area_id = duena.area_id
        and a.trabajo_en_equipo
    ) then
      raise exception 'Esta tarea no es de tu equipo';
    end if;
    if not pin_valido(v_quien, p_pin) then
      raise exception 'PIN incorrecto';
    end if;
    if not exists (select 1 from planes_dia
                   where fecha = v_asig.fecha and estado = 'publicado') then
      raise exception 'El reparto de este día no está publicado';
    end if;
  end if;

  v_hecha := greatest(coalesce(p_hecha, v_asig.cantidad_hecha), 0);
  v_estado := coalesce(p_estado,
    case when v_hecha >= v_asig.cantidad and v_asig.cantidad > 0 then 'listo'
         when v_hecha > 0 then 'en_proceso'
         else 'pendiente' end);
  if v_estado not in ('pendiente', 'en_proceso', 'listo') then
    raise exception 'Estado inválido';
  end if;
  if v_estado = 'listo' and v_hecha < v_asig.cantidad then
    v_hecha := v_asig.cantidad;
  end if;

  update asignaciones
     set cantidad_hecha = v_hecha, estado = v_estado,
         updated_at = now(), updated_by = auth.uid()
   where id = p_asignacion
  returning * into v_asig;

  return v_asig;
end;
$$;

revoke execute on function registrar_avance(bigint, text, integer, text, smallint) from anon, public;
grant  execute on function registrar_avance(bigint, text, integer, text, smallint) to authenticated;

commit;
