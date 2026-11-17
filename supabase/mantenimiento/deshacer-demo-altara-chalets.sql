-- Deshace los datos de DEMO de Altara y Chalets (cargados el 17 nov 2026):
-- inventarios y cierres del viernes 13, sábado 14 y lunes 16 de noviembre.
-- Correr antes de cargar el Excel de arranque o de usar la app de verdad.
delete from movimientos_diarios
 where fecha between '2026-11-13' and '2026-11-16'
   and sucursal_id in (select id from sucursales where nombre in ('Altara', 'Chalets'));
delete from cierres_dia
 where fecha between '2026-11-13' and '2026-11-16'
   and sucursal_id in (select id from sucursales where nombre in ('Altara', 'Chalets'));
