# Distribución por pastelera — reporte para validar con la administradora

Generado por `scripts/distribucion-excel.ts` el 2026-08-04, a partir de
`DISTRIBUCION PRODUCCION Y DECORACION.xlsx`. Los cuadros de producción ahora
salen **por área de producción (pastelera)** en lugar de por departamento.

## Resumen

| Qué | Cantidad |
|---|---|
| Áreas de producción | 6 |
| Productos asignados a un área | 117 |
| Productos sin área (cuadro "Sin área asignada") | 16 |

## Decisiones que necesitan visto bueno

1. **Producción 4B y 5B se fusionaron** en un solo cuadro "Producción 4B / 5B —
   Carolina y Silvia": el Excel les da la misma lista de productos y el sistema
   asigna cada producto a una sola área. ¿Está bien un cuadro compartido o hay
   que repartir cantidades entre ellas?
2. **Porciones**: cada "Porciones X" quedó en el área de su producto base
   (alguien las hornea). ¿Correcto, o las porciones no van en el cuadro?
3. **Decoración** no es un área: su cuadro repite los productos marcados con
   "Decorar". El Excel ya no lista terciopelo ni volteado en DECORACIÓN, pero
   se dejaron marcados por si fue omisión. ¿Se les quita la marca?
4. La sección DECORACIÓN agrega la marca "Decorar" a: VAINILLA /LUSTRE (6), VAINILLA SIN LUSTRE, CHOCOLATE CON LUSTRE (6), TWINKIE, GLASEADO DE NUEZ, GLASEADO DE NUEZ Porciones, GLASEADO COCO, BANANO, DULCE LECHE CHOCOLATE 8.
   Estos productos también entran al desglose de decoración en la captura de Principal.

## Interpretaciones ambiguas (⚠️ confirmar)

| Producto | Área | Nota |
|---|---|---|
| VAINILLA 9X13X2 | Producción 1 | el Excel dice "9X12X2"; el catálogo tiene 9X13X2 (mismo pastel de plancha) |
| Porciones VAINILLA | Producción 1 | el Excel dice "9X12X2"; el catálogo tiene 9X13X2 (mismo pastel de plancha) |
| ALMENDRA | Producción 1 | solo existe en el catálogo sin desglose de tamaño |
| Porciones ALMENDRA | Producción 1 | solo existe en el catálogo sin desglose de tamaño |
| MARMOLEADO | Producción 1 | solo existe en el catálogo sin desglose de tamaño |
| Porciones MARMOLEADO | Producción 1 | solo existe en el catálogo sin desglose de tamaño |
| CHOCOCREMA 6 | Producción 1 | ⚠️ "chocolate frío 6X2" interpretado como CHOCOCREMA 6 — validar |
| Porciones CHOCOCREMA 6 | Producción 1 | ⚠️ "chocolate frío 6X2" interpretado como CHOCOCREMA 6 — validar |
| CHOCOCREMA 8 | Producción 1 | ⚠️ "chocolate frío 8X2" interpretado como CHOCOCREMA 8 — validar |
| DULCE DE LECHE CHOCOLATE 6 | Producción 1 | solo aparece en la sección DECORACIÓN; se asigna a Producción 1 (misma columna del Excel) — validar |
| DULCE LECHE CHOCOLATE 8 | Producción 1 | solo aparece en la sección DECORACIÓN; se asigna a Producción 1 — validar |
| DULCE DE LECHE CHOCOLATE 10 | Producción 1 | solo aparece en la sección DECORACIÓN; se asigna a Producción 1 — validar |
| GLASEADO DE NUEZ | Producción 1 | solo aparece en la sección DECORACIÓN (glaseados); se asigna a Producción 1 — validar |
| GLASEADO DE NUEZ Porciones | Producción 1 | porción del glaseado de nuez; sigue a su producto base |
| GLASEADO COCO | Producción 1 | solo aparece en la sección DECORACIÓN ("mini coco"); se asigna a Producción 1 — validar |
| Porciones de pastel de 8 | Producción 1 | base ambigua en el catálogo; se asigna a Producción 1 (pasteles) — validar |
| VAINILLA /LUSTRE (6) | Producción 2 | cubre quequitos de vainilla con y sin lustre |
| VAINILLA SIN LUSTRE | Producción 2 | cubre quequitos de vainilla con y sin lustre |
| MINICAKE ALMENDRA /PASA | Producción 2 | el catálogo combina almendra y pasa en un solo producto |
| MIGA/CHOCO | Producción 2 | el catálogo combina galleta miga y miga de chocolate en MIGA/CHOCO |
| TORTA PC | Producción 2 | no aparece en el Excel nuevo; se asigna con el resto de TORTAS — validar (¿es la "tortas de mantequilla" de Producción 1?) |
| Porciones TORTA PC | Producción 2 | porción de la TORTA PC; sigue a su producto base |
| FLAN VAINILLA MEDIANO | Producción 3 | cubre mediano y copa |
| FLAN VAINILLA COPA | Producción 3 | cubre mediano y copa |
| FLAN COCO MEDIANO | Producción 3 | cubre mediano y copa |
| FLAN COCO COPA | Producción 3 | cubre mediano y copa |
| ESPUMILLAS | Producción 3 | cubre espumillas y espumilla de paleta |
| ESPUMILLA PALETA | Producción 3 | cubre espumillas y espumilla de paleta |
| CROISSANDWICH | Producción 4 | el catálogo combina grande y pequeño en CROISSANDWICH |
| DECORADAS | Producción 5 | ⚠️ "figuras" interpretado como galletas DECORADAS — validar |

## Filas del Excel sin producto en el catálogo (no se crearon)

Si alguno de estos sí se produce, hay que darlo de alta en el catálogo con su
regla de sugeridos antes de que aparezca en los cuadros.

| Bloque | Fila del Excel | Nota |
|---|---|---|
| PRODUCCION 1 | 9X2 | pastel de chocolate 9X2 no existe en el catálogo |
| PRODUCCION 1 | 11X2 | pastel de chocolate 11X2 no existe en el catálogo |
| PRODUCCION 1 | 9X12X2 | pastel de chocolate de plancha no existe en el catálogo |
| PRODUCCION 1 | 6X2 | almendra 6X2: el catálogo tiene ALMENDRA sin tamaños |
| PRODUCCION 1 | 8X2 | almendra 8X2: el catálogo tiene ALMENDRA sin tamaños |
| PRODUCCION 1 | 6X2 | marmoleada 6X2: el catálogo tiene MARMOLEADO sin tamaños |
| PRODUCCION 1 | 8X2 | marmoleada 8X2: el catálogo tiene MARMOLEADO sin tamaños |
| PRODUCCION 1 | COCO | pastel de mantequilla de coco no existe en el catálogo (¿es el GLASEADO COCO?) |
| PRODUCCION 1 | INDIVIDUAL COCO | individual de coco no existe en el catálogo |
| PRODUCCION 1 | TORTAS DE MANTEQUILLA | no existe con ese nombre; ¿es la TORTA PC (asignada a Producción 2)? |
| PRODUCCION 1 | 6X2 | volteado de piña 6X2 no existe en el catálogo (solo VOLTEADO 8) |
| PRODUCCION 1 | INDIVIDUALES | volteados individuales no existen en el catálogo |
| PRODUCCION 1 | 6X2 | pastel frío de vainilla 6X2 no existe en el catálogo (solo 3 LECHES 9 PULGADAS) |
| PRODUCCION 1 | 8X2 | pastel frío de vainilla 8X2 no existe en el catálogo |
| DECORACION | 6X2 | almendra 6X2: el catálogo tiene ALMENDRA sin tamaños |
| DECORACION | 8X2 | almendra 8X2: el catálogo tiene ALMENDRA sin tamaños |
| DECORACION | 6X2 | marmoleada 6X2: el catálogo tiene MARMOLEADO sin tamaños |
| DECORACION | 8X2 | marmoleada 8X2: el catálogo tiene MARMOLEADO sin tamaños |
| DECORACION | COCO | pastel de mantequilla de coco no existe en el catálogo |
| DECORACION | INDIVIDUAL COCO | individual de coco no existe en el catálogo |
| DECORACION | 6X2 | glaseado de nuez 6X2: el catálogo lo tiene sin tamaños |
| DECORACION | 8X2 | glaseado de nuez 8X2: el catálogo lo tiene sin tamaños |
| PRODUCCION 2 | GALLETA MIGA ZANAHORIA | galleta miga de zanahoria no existe en el catálogo |
| PRODUCCION 3 | MARACUYA | cheesecake mini de maracuyá no existe en el catálogo |
| PRODUCCION 5 | BOLLITOS QUESO | bollitos de queso no existen en el catálogo |

## Productos del catálogo que el Excel no menciona (cuadro "Sin área asignada")

Aparecen al final de /cuadros para no perder su producción. Candidatos a área:
fríos (tiramisú, cookies and cream, chocoalemán, selva negra) → ¿Producción 1?;
MICKEYS y CROISSANT PAN → ¿Producción 4?; FRUTA CRISTALIZADA → ¿Producción 5
(levaduras)?; DANESAS, TARTALETAS, COPENHAGUE → indicar.

- DANESAS (REPOSTERIA)
- FRUTA CRISTALIZADA (REPOSTERIA DE PAN)
- TARTALETAS FRUTA (REPOSTERIA DE PAN)
- CROISSANT PAN (PANES)
- MICKEYS (SALADO)
- CHOCOALEMAN 8 (FRIO VAINILLA)
- CHOCOALEMAN 6 (FRIO VAINILLA)
- COOKIES AND CREAM 8 (FRIO VAINILLA)
- COOKIES AND CREAM 6 (FRIO VAINILLA)
- TIRAMISU GRD (FRIO VAINILLA)
- TIRAMISU PEQ (FRIO VAINILLA)
- SELVA NEGRA 8 (FRIO CHOCOLATE)
- SELVA NEGRA 6 (FRIO CHOCOLATE)
- Porciones SELVA NEGRA 6 (FRIO CHOCOLATE)
- COPENHAGUE GRANDE (ESPECIALES)
- COPENHAGUE PEQUEÑO (ESPECIALES)

## Distribución completa

### Producción 1 — Kenia y Dany

- VAINILLA 6X2
- VAINILLA 8X2
- VAINILLA 9X2
- VAINILLA 10X2
- VAINILLA 11X2
- VAINILLA 9X13X2
- Porciones VAINILLA
- CHOCOLATE 6X2
- CHOCOLATE 8X2
- CHOCOLATE 10X2
- Porciones CHOCOLATE
- MIXTO 6X2
- MIXTO 8X2
- MIXTO 10X2
- Porciones MIXTO
- ZANAHORIA 6
- Porciones ZANAHORIA 6
- ZANAHORIA 8X2
- ZANAHORIA 10X2
- ALMENDRA
- Porciones ALMENDRA
- MARMOLEADO
- Porciones MARMOLEADO
- TERCIOPELO ROJO 6
- Porciones TERCIOPELO ROJO 6
- TERCIOPELO ROJO 8
- RED VELVET(6)
- VOLTEADO 8
- BROWNIE
- BRAZO GITANO
- PUDIN DE QUEQUE
- Porciones PUDIN DE QUEQUE
- SUSPIROS
- BISCOCHOS
- BANANO
- 3 LECHES 9 PULGADAS
- Porciones 3 LECHES 9 PULGADAS
- ECLIPSE 6
- ECLIPSE 8
- CHOCOCREMA 6
- Porciones CHOCOCREMA 6
- CHOCOCREMA 8
- CHOCOALMENDRA 6
- Porciones CHOCOALMENDRA 6
- CHOCOALMENDRA 8
- DULCE DE LECHE CHOCOLATE 6
- DULCE LECHE CHOCOLATE 8
- DULCE DE LECHE CHOCOLATE 10
- GLASEADO DE NUEZ
- GLASEADO DE NUEZ Porciones
- GLASEADO COCO
- Porciones de pastel de 8

### Producción 2 — Melissa y Johanna

- INDIVIDUALES 4X2
- INDIVIDUALES CHOCOLATE
- VAINILLA /LUSTRE (6)
- VAINILLA SIN LUSTRE
- CHOCOLATE CON LUSTRE (6)
- QUESADILLA INDIVIDUAL
- MARQUESOTE
- Porciones MARQUESOTE
- MARGARINA
- Porciones MARGARINA
- MINI MARGARINA
- MINICAKE ALMENDRA /PASA
- TWINKIE
- QUESADILLA ARROZ PORCION
- ELOTE 9 pulgadas
- Porciones ELOTE 9 pulgadas
- MIGA/CHOCO
- TORTA PC
- Porciones TORTA PC

### Producción 3 — Heidy

- DURAZNO
- Porciones DURAZNO
- PIE DE MANZANA
- PIE MANZANA DIETA
- NUEZ
- Porciones NUEZ
- PIÑA
- Porciones PIÑA
- LECHE
- Porciones LECHE
- LIMON
- Porciones LIMON
- CHEESECAKE---- PEQ
- CHEESECAKE GR
- Porciones CHEESECAKE GR
- QUEQUITOS CHEESECAKE FRESA
- QUEQUITOS CHEESECAKE OREO
- QUEQUITO CHEESECAKE DULCE LECHE
- FLAN VAINILLA MEDIANO
- FLAN VAINILLA COPA
- FLAN COCO MEDIANO
- FLAN COCO COPA
- CHOCOFLAN
- CHOCOFLAN PORCIONES
- ESPUMILLAS
- ESPUMILLA PALETA
- ALBOROTOS (RICE KRISPIES)
- PROFITEROLES
- RELAMPAGOS

### Producción 4 — Olivia

- SANDWICH POLLO
- SANDWICH POLLO DIETA
- SANDWICH JAMON Y QUESO
- CROISSANDWICH
- PIE DE POLLO

### Producción 4B / 5B — Carolina y Silvia

- PASTELITOS CARNE
- PASTELITOS POLLO
- PASTELITOS PIÑA
- ARROZ
- CREMA
- GALLETAS AJONJOJI
- GALLETAS COCO

### Producción 5 — Audry

- MANTEQUILLA/PASA
- CORTAR
- DECORADAS
- TRENZAS
- ENCANELADO 1
