# M2 — Reporte de migración del Excel (para validar con la administradora)

Generado por `scripts/migrar-excel.ts` el 2026-07-07.

## Resumen

| Qué | Cantidad |
|---|---|
| Departamentos (secciones del Excel) | 17 |
| Productos | 133 |
| Reglas de sugeridos | 818 |
| Productos sin ninguna regla | 1 |
| Advertencias a revisar | 11 |

## Cómo se interpretaron las reglas del Excel

| Texto en el Excel | Interpretación |
|---|---|
| `12` o `12 DIARIOS` | 12 todos los días |
| `4 M-J / 2 V-L` | 4 de martes a jueves; 2 de viernes a lunes |
| `8 S/D 12` | 8 de lunes a viernes; 12 sábado y domingo |
| `1V/2S` | 1 el viernes, 2 el sábado; el resto de días sin producción |
| `2 Y 2` / `24 / 12` | producto combinado: se sumó (ver advertencias) |

**⚠️ Confirmar con la administradora que estas lecturas son correctas antes de dar por cerrado M2.**

## Decoración

Se marcó `lleva_decoracion` a los productos de las secciones: VAINILLA, CHOCOLATE, MIXTO, PASTELES VARIOS (excepto porciones). Confirmar.

## Productos sin regla de sugerido

- ESPUMILLA PALETA (REPOSTERIA)

## Advertencias

| Hoja | Fila | Detalle |
|---|---|---|
| SUGERIDOS  PARA CAMBIAR | 56 | Century: Valor ilegible "Y": quedó sin regla |
| SUGERIDOS  PARA CAMBIAR | 68 | Cypress: Producto combinado ("2 Y 2"): se sumó como objetivo 4; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 68 | Chalets: Producto combinado ("5 y 5"): se sumó como objetivo 10; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 68 | Century: Producto combinado ("2 Y 2"): se sumó como objetivo 4; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 68 | Altara: Producto combinado ("2 Y 2"): se sumó como objetivo 4; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 68 | Palenque: Producto combinado ("2 Y 2"): se sumó como objetivo 4; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 106 | Cypress: Producto combinado ("24 / 12"): se sumó como objetivo 36; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 106 | Chalets: Producto combinado ("24 / 12"): se sumó como objetivo 36; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 106 | Century: Producto combinado ("24 / 12"): se sumó como objetivo 36; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 106 | Altara: Producto combinado ("24 / 12"): se sumó como objetivo 36; confirmar si deben ser dos productos |
| SUGERIDOS  PARA CAMBIAR | 106 | Palenque: Producto combinado ("24 / 12"): se sumó como objetivo 36; confirmar si deben ser dos productos |

## Casos de prueba sugeridos (verificar contra el Excel impreso)

- **VAINILLA 6X2** en Cypress: objetivo 12 (todos los días)
- **ALBOROTOS (RICE KRISPIES)** en Palenque: objetivo 6 (todos los días)
- **CHOCOFLAN** en Palenque: objetivo 1 (todos los días)
