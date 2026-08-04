-- =====================================================================
-- Áreas de producción (pasteleras) — generado por scripts/distribucion-excel.ts
-- Fuente: DISTRIBUCION PRODUCCION Y DECORACION.xlsx · Generado: 2026-08-04
-- Un cuadro de producción por área; ver docs/validacion-distribucion.md.
-- =====================================================================

begin;

create table areas_produccion (
  id         smallint generated always as identity primary key,
  nombre     text     not null unique,
  encargadas text     not null,
  orden      smallint not null unique,
  activa     boolean  not null default true
);

alter table areas_produccion enable row level security;

-- Mismas políticas que el resto del catálogo (0001): todos leen, admin escribe.
create policy area_lectura on areas_produccion
  for select to authenticated using (true);
create policy area_admin on areas_produccion
  for all to authenticated using (es_admin()) with check (es_admin());

insert into areas_produccion (nombre, encargadas, orden) values
  ('Producción 1', 'Kenia y Dany', 1),
  ('Producción 2', 'Melissa y Johanna', 2),
  ('Producción 3', 'Heidy', 3),
  ('Producción 4', 'Olivia', 4),
  ('Producción 4B / 5B', 'Carolina y Silvia', 5),
  ('Producción 5', 'Audry', 6);

-- área y orden dentro del cuadro; null = sin área asignada (cuadro final)
alter table productos
  add column area_id    smallint references areas_produccion(id),
  add column orden_area smallint;

update productos p
set area_id = a.id, orden_area = v.orden
from (values
  ('VAINILLA', '6X2', 'Producción 1', 10::smallint),
  ('VAINILLA', '8X2', 'Producción 1', 20),
  ('VAINILLA', '9X2', 'Producción 1', 30),
  ('VAINILLA', '10X2', 'Producción 1', 40),
  ('VAINILLA', '11X2', 'Producción 1', 50),
  ('VAINILLA', '9X13X2', 'Producción 1', 60),
  ('Porciones VAINILLA', null, 'Producción 1', 70),
  ('CHOCOLATE', '6X2', 'Producción 1', 80),
  ('CHOCOLATE', '8X2', 'Producción 1', 90),
  ('CHOCOLATE', '10X2', 'Producción 1', 100),
  ('Porciones CHOCOLATE', null, 'Producción 1', 110),
  ('MIXTO', '6X2', 'Producción 1', 120),
  ('MIXTO', '8X2', 'Producción 1', 130),
  ('MIXTO', '10X2', 'Producción 1', 140),
  ('Porciones MIXTO', null, 'Producción 1', 150),
  ('ZANAHORIA 6', null, 'Producción 1', 160),
  ('Porciones ZANAHORIA 6', null, 'Producción 1', 170),
  ('ZANAHORIA 8X2', null, 'Producción 1', 180),
  ('ZANAHORIA 10X2', null, 'Producción 1', 190),
  ('ALMENDRA', null, 'Producción 1', 200),
  ('Porciones ALMENDRA', null, 'Producción 1', 210),
  ('MARMOLEADO', null, 'Producción 1', 220),
  ('Porciones MARMOLEADO', null, 'Producción 1', 230),
  ('TERCIOPELO ROJO 6', null, 'Producción 1', 240),
  ('Porciones TERCIOPELO ROJO 6', null, 'Producción 1', 250),
  ('TERCIOPELO ROJO 8', null, 'Producción 1', 260),
  ('RED VELVET(6)', null, 'Producción 1', 270),
  ('VOLTEADO 8', null, 'Producción 1', 280),
  ('BROWNIE', null, 'Producción 1', 290),
  ('BRAZO GITANO', null, 'Producción 1', 300),
  ('PUDIN DE QUEQUE', null, 'Producción 1', 310),
  ('Porciones PUDIN DE QUEQUE', null, 'Producción 1', 320),
  ('SUSPIROS', null, 'Producción 1', 330),
  ('BISCOCHOS', null, 'Producción 1', 340),
  ('BANANO', null, 'Producción 1', 350),
  ('3 LECHES 9 PULGADAS', null, 'Producción 1', 360),
  ('Porciones 3 LECHES 9 PULGADAS', null, 'Producción 1', 370),
  ('ECLIPSE 6', null, 'Producción 1', 380),
  ('ECLIPSE 8', null, 'Producción 1', 390),
  ('CHOCOCREMA 6', null, 'Producción 1', 400),
  ('Porciones CHOCOCREMA 6', null, 'Producción 1', 410),
  ('CHOCOCREMA 8', null, 'Producción 1', 420),
  ('CHOCOALMENDRA 6', null, 'Producción 1', 430),
  ('Porciones CHOCOALMENDRA 6', null, 'Producción 1', 440),
  ('CHOCOALMENDRA 8', null, 'Producción 1', 450),
  ('DULCE DE LECHE CHOCOLATE 6', null, 'Producción 1', 460),
  ('DULCE LECHE CHOCOLATE 8', null, 'Producción 1', 470),
  ('DULCE DE LECHE CHOCOLATE 10', null, 'Producción 1', 480),
  ('GLASEADO DE NUEZ', null, 'Producción 1', 490),
  ('GLASEADO DE NUEZ Porciones', null, 'Producción 1', 500),
  ('GLASEADO COCO', null, 'Producción 1', 510),
  ('Porciones de pastel de 8', null, 'Producción 1', 520),
  ('INDIVIDUALES 4X2', null, 'Producción 2', 10),
  ('INDIVIDUALES CHOCOLATE', null, 'Producción 2', 20),
  ('VAINILLA /LUSTRE (6)', null, 'Producción 2', 30),
  ('VAINILLA SIN LUSTRE', null, 'Producción 2', 40),
  ('CHOCOLATE CON LUSTRE (6)', null, 'Producción 2', 50),
  ('QUESADILLA INDIVIDUAL', null, 'Producción 2', 60),
  ('MARQUESOTE', null, 'Producción 2', 70),
  ('Porciones MARQUESOTE', null, 'Producción 2', 80),
  ('MARGARINA', null, 'Producción 2', 90),
  ('Porciones MARGARINA', null, 'Producción 2', 100),
  ('MINI MARGARINA', null, 'Producción 2', 110),
  ('MINICAKE ALMENDRA /PASA', null, 'Producción 2', 120),
  ('TWINKIE', null, 'Producción 2', 130),
  ('QUESADILLA ARROZ PORCION', null, 'Producción 2', 140),
  ('ELOTE 9 pulgadas', null, 'Producción 2', 150),
  ('Porciones ELOTE 9 pulgadas', null, 'Producción 2', 160),
  ('MIGA/CHOCO', null, 'Producción 2', 170),
  ('TORTA PC', null, 'Producción 2', 180),
  ('Porciones TORTA PC', null, 'Producción 2', 190),
  ('DURAZNO', null, 'Producción 3', 10),
  ('Porciones DURAZNO', null, 'Producción 3', 20),
  ('PIE DE MANZANA', null, 'Producción 3', 30),
  ('PIE MANZANA DIETA', null, 'Producción 3', 40),
  ('NUEZ', null, 'Producción 3', 50),
  ('Porciones NUEZ', null, 'Producción 3', 60),
  ('PIÑA', null, 'Producción 3', 70),
  ('Porciones PIÑA', null, 'Producción 3', 80),
  ('LECHE', null, 'Producción 3', 90),
  ('Porciones LECHE', null, 'Producción 3', 100),
  ('LIMON', null, 'Producción 3', 110),
  ('Porciones LIMON', null, 'Producción 3', 120),
  ('CHEESECAKE---- PEQ', null, 'Producción 3', 130),
  ('CHEESECAKE GR', null, 'Producción 3', 140),
  ('Porciones CHEESECAKE GR', null, 'Producción 3', 150),
  ('QUEQUITOS CHEESECAKE FRESA', null, 'Producción 3', 160),
  ('QUEQUITOS CHEESECAKE OREO', null, 'Producción 3', 170),
  ('QUEQUITO CHEESECAKE DULCE LECHE', null, 'Producción 3', 180),
  ('FLAN VAINILLA MEDIANO', null, 'Producción 3', 190),
  ('FLAN VAINILLA COPA', null, 'Producción 3', 200),
  ('FLAN COCO MEDIANO', null, 'Producción 3', 210),
  ('FLAN COCO COPA', null, 'Producción 3', 220),
  ('CHOCOFLAN', null, 'Producción 3', 230),
  ('CHOCOFLAN PORCIONES', null, 'Producción 3', 240),
  ('ESPUMILLAS', null, 'Producción 3', 250),
  ('ESPUMILLA PALETA', null, 'Producción 3', 260),
  ('ALBOROTOS (RICE KRISPIES)', null, 'Producción 3', 270),
  ('PROFITEROLES', null, 'Producción 3', 280),
  ('RELAMPAGOS', null, 'Producción 3', 290),
  ('SANDWICH POLLO', null, 'Producción 4', 10),
  ('SANDWICH POLLO DIETA', null, 'Producción 4', 20),
  ('SANDWICH JAMON Y QUESO', null, 'Producción 4', 30),
  ('CROISSANDWICH', null, 'Producción 4', 40),
  ('PIE DE POLLO', null, 'Producción 4', 50),
  ('PASTELITOS CARNE', null, 'Producción 4B / 5B', 10),
  ('PASTELITOS POLLO', null, 'Producción 4B / 5B', 20),
  ('PASTELITOS PIÑA', null, 'Producción 4B / 5B', 30),
  ('ARROZ', null, 'Producción 4B / 5B', 40),
  ('CREMA', null, 'Producción 4B / 5B', 50),
  ('GALLETAS AJONJOJI', null, 'Producción 4B / 5B', 60),
  ('GALLETAS COCO', null, 'Producción 4B / 5B', 70),
  ('MANTEQUILLA/PASA', null, 'Producción 5', 10),
  ('CORTAR', null, 'Producción 5', 20),
  ('DECORADAS', null, 'Producción 5', 30),
  ('TRENZAS', null, 'Producción 5', 40),
  ('ENCANELADO 1', null, 'Producción 5', 50)
) as v(nombre, tamano, area, orden)
join areas_produccion a on a.nombre = v.area
where p.nombre = v.nombre and p.tamano is not distinct from v.tamano;

-- Decoración según la sección DECORACIÓN del Excel (solo se agrega, no se quita)
update productos set lleva_decoracion = true
where tamano is null and nombre in (
  'VAINILLA /LUSTRE (6)',
  'VAINILLA SIN LUSTRE',
  'CHOCOLATE CON LUSTRE (6)',
  'TWINKIE',
  'GLASEADO DE NUEZ',
  'GLASEADO DE NUEZ Porciones',
  'GLASEADO COCO',
  'BANANO',
  'DULCE LECHE CHOCOLATE 8'
);

-- Verificación: todas las asignaciones deben haber casado con un producto.
do $$
declare n integer;
begin
  select count(*) into n from productos where area_id is not null;
  if n <> 117 then
    raise exception 'productos con área: % (esperados 117)', n;
  end if;
end $$;

commit;
