-- 0022 · Catálogo de la lista "INVENTRIO NUEVA PLATAFORMA.xlsx" (8 nov 2026).
-- Aplicada directamente en Supabase el 8 nov (SQL directo); queda acá como registro.
-- Fila del Excel × 10 = productos.orden; sección = categoria. Los que coinciden conservan
-- id, historial y objetivos; 30 nuevos sin objetivos (CHOCOLATE CRISPIE 6 copia los del 8);
-- 11 que no están en la lista se desactivan (orden 10000 + anterior). Pleca (/) = dos productos.
begin;
-- 1. Retirar de la lista: desactivados (no se borran) y fuera del orden nuevo
update productos set activo = false, orden = 10000 + coalesce(orden, 0) where id in (24, 25, 36, 37, 57, 145, 99, 100, 101, 133, 135);
-- 2. Existentes: nombre, sección y orden de la lista nueva
update productos set categoria = 'VAINILLA', orden = 30 where id = 8; -- VAINILLA 6X2
update productos set categoria = 'VAINILLA', orden = 40 where id = 9; -- VAINILLA 8X2
update productos set categoria = 'VAINILLA', orden = 50 where id = 10; -- VAINILLA 9X2
update productos set categoria = 'VAINILLA', orden = 60 where id = 11; -- VAINILLA 10X2
update productos set categoria = 'VAINILLA', orden = 70 where id = 12; -- VAINILLA 11X2
update productos set categoria = 'VAINILLA', orden = 80 where id = 13; -- VAINILLA 9X13X2
update productos set categoria = 'VAINILLA', orden = 90, nombre = 'Porciones VAINILLA' where id = 14; -- Porciones VAINILLA
update productos set categoria = 'CHOCOLATE', orden = 110 where id = 15; -- CHOCOLATE 6X2
update productos set categoria = 'CHOCOLATE', orden = 120 where id = 16; -- CHOCOLATE 8X2
update productos set categoria = 'CHOCOLATE', orden = 130 where id = 17; -- CHOCOLATE 10X2
update productos set categoria = 'CHOCOLATE', orden = 140, nombre = 'Porciones CHOCOLATE' where id = 18; -- Porciones CHOCOLATE
update productos set categoria = 'MIXTO', orden = 160 where id = 19; -- MIXTO 6X2
update productos set categoria = 'MIXTO', orden = 170 where id = 20; -- MIXTO 8X2
update productos set categoria = 'MIXTO', orden = 180 where id = 21; -- MIXTO 10X2
update productos set categoria = 'MIXTO', orden = 190, nombre = 'Porciones MIXTO' where id = 22; -- Porciones MIXTO
update productos set categoria = 'PASTELES VARIOS', orden = 210, nombre = 'ZANAHORIA 6' where id = 27; -- ZANAHORIA 6
update productos set categoria = 'PASTELES VARIOS', orden = 220, nombre = 'ZANAHORIA 8' where id = 26; -- ZANAHORIA 8X2
update productos set categoria = 'PASTELES VARIOS', orden = 230, nombre = 'ZANAHORIA 10' where id = 23; -- ZANAHORIA 10X2
update productos set categoria = 'PASTELES VARIOS', orden = 240, nombre = 'Porciones ZANAHORIA' where id = 28; -- Porciones ZANAHORIA 6
update productos set categoria = 'PASTELES VARIOS', orden = 300, nombre = 'CHOCOLATE CRISPIE 8' where id = 71; -- CHOCOLATE CRISPI
update productos set categoria = 'PASTELES VARIOS', orden = 320, nombre = 'GLASEADO NUEZ DE VAINILLA 8' where id = 47; -- GLASEADO DE NUEZ
update productos set categoria = 'PASTELES VARIOS', orden = 330, nombre = 'Porciones GLASEADO NUEZ DE VAINILLA' where id = 61; -- GLASEADO DE NUEZ Porciones
update productos set categoria = 'PASTELES VARIOS', orden = 340, nombre = 'ALMENDRA' where id = 29; -- ALMENDRA
update productos set categoria = 'PASTELES VARIOS', orden = 350, nombre = 'Porciones ALMENDRA' where id = 30; -- Porciones ALMENDRA
update productos set categoria = 'PASTELES VARIOS', orden = 360, nombre = 'MARMOLEADO' where id = 31; -- MARMOLEADO
update productos set categoria = 'PASTELES VARIOS', orden = 370, nombre = 'Porciones MARMOLEADO' where id = 32; -- Porciones MARMOLEADO
update productos set categoria = 'PASTELES VARIOS', orden = 380, nombre = 'BANANO' where id = 76; -- BANANO / PORCION
update productos set categoria = 'PERSONALES', orden = 430, nombre = 'INDIVIDUALES 4X2 VAINILLA' where id = 38; -- INDIVIDUALES 4X2
update productos set categoria = 'PERSONALES', orden = 440, nombre = 'INDIVIDUALES 4X2 CHOCOLATE' where id = 40; -- INDIVIDUALES CHOCOLATE
update productos set categoria = 'PERSONALES', orden = 450, nombre = 'INDIVIDUALES RECTANGULARES' where id = 146; -- INDIVIDUALES RECTANGULARES
update productos set categoria = 'PERSONALES', orden = 460, nombre = 'BROWNIE' where id = 59; -- BROWNIE
update productos set categoria = 'PERSONALES', orden = 470, nombre = 'MINI BRAZO GITANO' where id = 60; -- MINI BRAZO GITANO
update productos set categoria = 'PERSONALES', orden = 480, nombre = 'TWINKIE' where id = 66; -- TWINKIE
update productos set categoria = 'PERSONALES', orden = 490, nombre = 'MINI ALMENDRA' where id = 67; -- MINICAKE ALMENDRA /PASA
update productos set categoria = 'PERSONALES', orden = 510, nombre = 'ALBOROTOS' where id = 65; -- ALBOROTOS (RICE KRISPIES)
update productos set categoria = 'PERSONALES', orden = 520, nombre = 'ESPUMILLAS' where id = 69; -- ESPUMILLAS
update productos set categoria = 'QUEQUITOS', orden = 540, nombre = 'VAINILLA SIN LUSTRE' where id = 41; -- VAINILLA SIN LUSTRE
update productos set categoria = 'QUEQUITOS', orden = 550, nombre = 'VAINILLA CON LUSTRE (6)' where id = 39; -- VAINILLA /LUSTRE (6)
update productos set categoria = 'QUEQUITOS', orden = 560, nombre = 'CHOCOLATE (6)' where id = 42; -- CHOCOLATE CON LUSTRE (6)
update productos set categoria = 'QUEQUITOS', orden = 570, nombre = 'RED VELVET (6)' where id = 43; -- RED VELVET(6)
update productos set categoria = 'QUEQUITOS', orden = 580, nombre = 'QUEQUITOS QUESADILLA' where id = 44; -- QUESADILLA INDIVIDUAL
update productos set categoria = 'QUEQUITOS', orden = 590, nombre = 'SUSPIROS' where id = 138; -- SUSPIROS
update productos set categoria = 'QUEQUITOS', orden = 600, nombre = 'BISCOCHOS' where id = 107; -- BISCOCHOS
update productos set categoria = 'QUEQUITOS', orden = 620, nombre = 'ELOTE' where id = 55; -- ELOTE 9 pulgadas
update productos set categoria = 'QUEQUITOS', orden = 630, nombre = 'Porciones ELOTE' where id = 56; -- Porciones ELOTE 9 pulgadas
update productos set categoria = 'QUEQUITOS', orden = 640, nombre = 'PUDIN DE QUEQUE' where id = 63; -- PUDIN DE QUEQUE
update productos set categoria = 'QUEQUITOS', orden = 650, nombre = 'Porciones PUDIN DE QUEQUE' where id = 64; -- Porciones PUDIN DE QUEQUE
update productos set categoria = 'QUEQUITOS', orden = 660, nombre = 'QUESADILLA DE ARROZ' where id = 73; -- QUESADILLA ARROZ
update productos set categoria = 'QUEQUITOS', orden = 680, nombre = 'QUESADILLA DE TRIGO' where id = 74; -- QUESADILLA ARROZ TRIGO /PORCION
update productos set categoria = 'TORTAS', orden = 710, nombre = 'MARQUESOTE' where id = 48; -- MARQUESOTE
update productos set categoria = 'TORTAS', orden = 720, nombre = 'Porciones MARQUESOTE' where id = 49; -- Porciones MARQUESOTE
update productos set categoria = 'TORTAS', orden = 730, nombre = 'TORTA PC' where id = 50; -- TORTA PC
update productos set categoria = 'TORTAS', orden = 740, nombre = 'Porciones TORTA PC' where id = 51; -- Porciones TORTA PC
update productos set categoria = 'TORTAS', orden = 750, nombre = 'TORTA MARGARINA' where id = 52; -- MARGARINA
update productos set categoria = 'TORTAS', orden = 760, nombre = 'Porciones TORTA MARGARINA' where id = 53; -- Porciones MARGARINA
update productos set categoria = 'TORTAS', orden = 770, nombre = 'MINI TORTAS MARGARINA' where id = 54; -- MINI MARGARINA
update productos set categoria = 'REPOSTERIA LEVADURA', orden = 790, nombre = 'DANESAS (6)' where id = 62; -- DANESAS
update productos set categoria = 'REPOSTERIA LEVADURA', orden = 800, nombre = 'TRENZAS' where id = 70; -- TRENZAS
update productos set categoria = 'REPOSTERIA LEVADURA', orden = 810, nombre = 'ENCANELADOS' where id = 72; -- ENCANELADO 1
update productos set categoria = 'REPOSTERIA LEVADURA', orden = 820, nombre = 'CROISSANT' where id = 95; -- CROISSANT PAN
update productos set categoria = 'REPOSTERIA LEVADURA', orden = 830, nombre = 'COPENHAGUE GRANDE' where id = 136; -- COPENHAGUE GRANDE
update productos set categoria = 'REPOSTERIA LEVADURA', orden = 840, nombre = 'COPENHAGUE PEQUEÑO' where id = 137; -- COPENHAGUE PEQUEÑO
update productos set categoria = 'PIES', orden = 870, nombre = 'PIE NUEZ' where id = 77; -- NUEZ
update productos set categoria = 'PIES', orden = 880, nombre = 'Porciones PIE NUEZ' where id = 78; -- Porciones NUEZ
update productos set categoria = 'PIES', orden = 890, nombre = 'DURAZNO' where id = 79; -- DURAZNO
update productos set categoria = 'PIES', orden = 900, nombre = 'Porciones DURAZNO' where id = 80; -- Porciones DURAZNO
update productos set categoria = 'PIES', orden = 910, nombre = 'PIÑA' where id = 81; -- PIÑA
update productos set categoria = 'PIES', orden = 920, nombre = 'Porciones PIÑA' where id = 82; -- Porciones PIÑA
update productos set categoria = 'PIES', orden = 930, nombre = 'MANZANA' where id = 45; -- PIE DE MANZANA
update productos set categoria = 'PIES', orden = 950, nombre = 'MANZANA DIETA' where id = 68; -- PIE MANZANA DIETA
update productos set categoria = 'PIES', orden = 970, nombre = 'LECHE' where id = 83; -- LECHE
update productos set categoria = 'PIES', orden = 980, nombre = 'Porciones LECHE' where id = 84; -- Porciones LECHE
update productos set categoria = 'PIES', orden = 990, nombre = 'LIMON' where id = 85; -- LIMON
update productos set categoria = 'PIES', orden = 1000, nombre = 'Porciones LIMON' where id = 86; -- Porciones LIMON
update productos set categoria = 'PIES', orden = 1010, nombre = 'CHEESECAKE GRANDE' where id = 87; -- CHEESECAKE GR F-O-MAR
update productos set categoria = 'PIES', orden = 1020, nombre = 'CHEESECAKE PEQUEÑO' where id = 89; -- CHEESECAKE---- PEQ F-O-MAR
update productos set categoria = 'PIES', orden = 1030, nombre = 'Porciones CHEESECAKE' where id = 88; -- Porciones CHEESECAKE GR F-O-MAR
update productos set categoria = 'VASOS SABORES', orden = 1090, nombre = 'VASOS LECHE' where id = 147; -- VASOS PIE LECHE
update productos set categoria = 'VASOS SABORES', orden = 1100, nombre = 'VASOS LIMON' where id = 148; -- VASOS LIMON
update productos set categoria = 'VASOS SABORES', orden = 1110, nombre = 'VASOS OREO' where id = 93; -- VASOS CHOCOLATE OREO
update productos set categoria = 'VASOS SABORES', orden = 1120, nombre = 'VASOS FRESA' where id = 92; -- VASOS CHEESECAKE FRESA
update productos set categoria = 'VASOS SABORES', orden = 1130, nombre = 'VASOS MARACUYA' where id = 149; -- VASOS MARACUYA
update productos set categoria = 'PASTELITOS / SALADO', orden = 1150, nombre = 'PIE POLLO' where id = 46; -- PIE DE POLLO
update productos set categoria = 'PASTELITOS / SALADO', orden = 1160, nombre = 'PASTELITOS CARNE' where id = 103; -- PASTELITOS CARNE
update productos set categoria = 'PASTELITOS / SALADO', orden = 1170, nombre = 'PASTELITOS POLLO' where id = 104; -- PASTELITOS POLLO
update productos set categoria = 'PASTELITOS / SALADO', orden = 1180, nombre = 'PASTELITOS PIÑA' where id = 102; -- PASTELITOS PIÑA
update productos set categoria = 'PASTELITOS / SALADO', orden = 1200, nombre = 'MICKEYS' where id = 105; -- MICKEYS
update productos set categoria = 'PASTELITOS / SALADO', orden = 1210, nombre = 'CROISSANDWICH' where id = 106; -- CROISSANDWICH
update productos set categoria = 'PASTELITOS / SALADO', orden = 1220, nombre = 'SANDWICH POLLO' where id = 108; -- SANDWICH POLLO
update productos set categoria = 'PASTELITOS / SALADO', orden = 1225, nombre = 'SANDWICH POLLO DIETA' where id = 109; -- SANDWICH POLLO DIETA
update productos set categoria = 'PASTELITOS / SALADO', orden = 1230, nombre = 'SANDWICH DE JAMÓN Y QUESO' where id = 110; -- SANDWICH JAMON Y QUESO
update productos set categoria = 'GALLETAS', orden = 1250, nombre = 'ARROZ' where id = 96; -- ARROZ
update productos set categoria = 'GALLETAS', orden = 1260, nombre = 'CORTAR' where id = 97; -- CORTAR
update productos set categoria = 'GALLETAS', orden = 1270, nombre = 'MANTEQUILLA PASA' where id = 98; -- MANTEQUILLA/PASA
update productos set categoria = 'REPOSTERIA FRIA', orden = 1310, nombre = 'TERCIOPELO 6' where id = 34; -- TERCIOPELO ROJO 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1320, nombre = 'TERCIOPELO 8' where id = 33; -- TERCIOPELO ROJO 8
update productos set categoria = 'REPOSTERIA FRIA', orden = 1330, nombre = 'Porciones TERCIOPELO' where id = 35; -- Porciones TERCIOPELO ROJO 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1340, nombre = '3 LECHES GRANDE' where id = 111; -- 3 LECHES 9 PULGADAS
update productos set categoria = 'REPOSTERIA FRIA', orden = 1350, nombre = 'Porciones 3 LECHES' where id = 112; -- Porciones 3 LECHES 9 PULGADAS
update productos set categoria = 'REPOSTERIA FRIA', orden = 1360, nombre = 'CHOCOALEMAN 6' where id = 114; -- CHOCOALEMAN 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1370, nombre = 'CHOCOALEMAN 8' where id = 113; -- CHOCOALEMAN 8
update productos set categoria = 'REPOSTERIA FRIA', orden = 1390, nombre = 'CHOCOCREMA 6' where id = 122; -- CHOCOCREMA 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1400, nombre = 'CHOCOCREMA 8' where id = 121; -- CHOCOCREMA 8
update productos set categoria = 'REPOSTERIA FRIA', orden = 1410, nombre = 'Porciones CHOCOCREMA' where id = 123; -- Porciones CHOCOCREMA 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1420, nombre = 'CHOCOALMENDRA 6' where id = 128; -- CHOCOALMENDRA 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1430, nombre = 'CHOCOALMENDRA 8' where id = 127; -- CHOCOALMENDRA 8
update productos set categoria = 'REPOSTERIA FRIA', orden = 1440, nombre = 'Porciones CHOCOALMENDRA' where id = 129; -- Porciones CHOCOALMENDRA 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1450, nombre = 'SELVA NEGRA 6' where id = 125; -- SELVA NEGRA 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1460, nombre = 'SELVA NEGRA 8' where id = 124; -- SELVA NEGRA 8
update productos set categoria = 'REPOSTERIA FRIA', orden = 1470, nombre = 'Porciones SELVA NEGRA' where id = 126; -- Porciones SELVA NEGRA 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1480, nombre = 'ECLIPSE 6' where id = 120; -- ECLIPSE 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1490, nombre = 'ECLIPSE 8' where id = 119; -- ECLIPSE 8
update productos set categoria = 'REPOSTERIA FRIA', orden = 1510, nombre = 'COOKIES 6' where id = 116; -- COOKIES AND CREAM 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1520, nombre = 'COOKIES 8' where id = 115; -- COOKIES AND CREAM 8
update productos set categoria = 'REPOSTERIA FRIA', orden = 1540, nombre = 'DURAZNO CHANTILLY 6' where id = 150; -- DURAZNO CHANTILLY 6
update productos set categoria = 'REPOSTERIA FRIA', orden = 1560, nombre = 'PROFITEROLES' where id = 130; -- PROFITEROLES
update productos set categoria = 'REPOSTERIA FRIA', orden = 1570, nombre = 'RELAMPAGOS' where id = 131; -- RELAMPAGOS
update productos set categoria = 'REPOSTERIA FRIA', orden = 1580, nombre = 'FLAN DE VAINILLA' where id = 132; -- FLAN VAINILLA MEDIANO
update productos set categoria = 'REPOSTERIA FRIA', orden = 1600, nombre = 'FLAN COCO' where id = 134; -- FLAN COCO MEDIANO
update productos set categoria = 'REPOSTERIA FRIA', orden = 1620, nombre = 'CHOCOFLAN' where id = 140; -- CHOCOFLAN
update productos set categoria = 'REPOSTERIA FRIA', orden = 1630, nombre = 'Porciones CHOCOFLAN' where id = 139; -- CHOCOFLAN PORCIONES
-- 3. Nuevos (sin objetivos; departamento del producto anterior de la lista; sin área)
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CHOCOLATE GLASEADO 6', 'PASTELES VARIOS', 7, false, true, 250);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CHOCOLATE GLASEADO 8', 'PASTELES VARIOS', 7, false, true, 260);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CHOCOLATE GLASEADO 10', 'PASTELES VARIOS', 7, false, true, 270);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones CHOCOLATE GLASEADO', 'PASTELES VARIOS', 7, false, true, 280);
insert into productos (nombre, categoria, tamano, departamento_id, lleva_decoracion, activo, area_id, orden, temporada, libras) select 'CHOCOLATE CRISPIE 6', 'PASTELES VARIOS', null, departamento_id, lleva_decoracion, true, area_id, 290, temporada, libras from productos where id = 71;
insert into reglas_sugerido (producto_id, sucursal_id, dia_semana, objetivo) select (select id from productos where nombre = 'CHOCOLATE CRISPIE 6' and activo), sucursal_id, dia_semana, objetivo from reglas_sugerido where producto_id = 71;
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones CHOCOLATE CRISPIE', 'PASTELES VARIOS', 11, false, true, 310);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones BANANO', 'PASTELES VARIOS', 11, false, true, 390);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('VOLTEADO PIÑA', 'PERSONALES', 11, false, true, 410);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('GLASEADO COCO', 'PERSONALES', 11, false, true, 420);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('MINI PASA', 'PERSONALES', 10, false, true, 500);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('REPOSTERIA SODA', 'QUEQUITOS', 16, false, true, 610);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones QUESADILLA DE ARROZ', 'QUEQUITOS', 11, false, true, 670);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones QUESADILLA DE TRIGO', 'QUEQUITOS', 11, false, true, 690);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones MANZANA', 'PIES', 8, false, true, 940);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones MANZANA DIETA', 'PIES', 10, false, true, 960);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CHEESECAKE OREO', 'PIES', 12, false, true, 1040);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CHEESECAKE FRESA', 'PIES', 12, false, true, 1050);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CHEESECAKE MARACUYA', 'PIES', 12, false, true, 1060);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones CHEESECAKE OREO', 'PIES', 12, false, true, 1070);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones CHEESECAKE FRESA', 'PIES', 12, false, true, 1073);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones CHEESECAKE MARACUYA', 'PIES', 12, false, true, 1076);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('PASTELITOS GUAYABA', 'PASTELITOS / SALADO', 15, false, true, 1190);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CREMA MIGA', 'GALLETAS', 15, false, true, 1280);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('CHOCOLATE (GALLETA)', 'GALLETAS', 15, false, true, 1285);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('3 LECHES PEQUEÑO', 'REPOSTERIA FRIA', 17, false, true, 1345);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones CHOCOALEMAN', 'REPOSTERIA FRIA', 17, false, true, 1380);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones ECLIPSE', 'REPOSTERIA FRIA', 17, false, true, 1500);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones COOKIES', 'REPOSTERIA FRIA', 17, false, true, 1530);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones FLAN DE VAINILLA', 'REPOSTERIA FRIA', 19, false, true, 1590);
insert into productos (nombre, categoria, departamento_id, lleva_decoracion, activo, orden) values ('Porciones FLAN COCO', 'REPOSTERIA FRIA', 19, false, true, 1610);
commit;
