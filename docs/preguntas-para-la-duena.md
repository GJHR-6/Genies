# Preguntas para la dueña

Lista de dudas pendientes al repasar el sistema (actualizada el 12 de noviembre de 2026). Al lado de cada una: cómo quedó mientras tanto en la app.

## Productos y áreas (quién hace qué)

1. **CHOCOLATE CRISPIE / FUDGE 6 y 8 (y sus porciones)**: primero se dijo «solo en deco: nada de producción»; en la lista nueva dicen «kenia». ¿Se producen o solo se decoran?
   *Mientras tanto:* en producción con Kenia (Producción 1), y además marcados para decoración.
2. **GLASEADO NUEZ DE VAINILLA 8 (y sus porciones)**: misma duda que el anterior (se había puesto como solo decoración; la lista dice «kenia»).
   *Mientras tanto:* en producción con Kenia, y además marcados para decoración.
3. **«glaseados» al lado de Audrey (Galletas)**: ¿qué productos son? Los glaseados que hay hoy están todos con Kenia: GLASEADO COCO, GLASEADOS DE COCO MINICAKE, GLASEADO NUEZ DE VAINILLA 8 y CHOCOLATE GLASEADO 6, 8 y 10. ¿Alguno pasa a Audrey, o es un producto que falta en la lista?
   *Mientras tanto:* sin cambios (con Kenia).
4. **ESPECIALES (Audrey)**: ¿es un producto (por ejemplo galletas especiales) o solo un título? No existe ningún producto con ese nombre.
   *Mientras tanto:* no se creó nada.
5. **Productos que las tiendas siguen vendiendo pero no están en la lista nueva**: DULCE DE LECHE CHOCOLATE 6, 8 y 10, Porciones de pastel de 8, VOLTEADO MINI CAKE, GLASEADOS DE COCO MINICAKE, CREMA, MIGA/CHOCO, DECORADAS, FLAN VAINILLA COPA y FLAN COCO COPA. ¿Siguen, se dejan de vender, o son los mismos que algún producto nuevo con otro nombre (por ejemplo DULCE DE LECHE CHOCOLATE = CHOCOLATE GLASEADO)?
   *Mientras tanto:* activos, cada uno en su sección.
6. **Dany**: la lista solo nombra a Kenia en Producción 1. ¿Dany sigue trabajando en esa área (en equipo con Kenia)?
   *Mientras tanto:* Producción 1 = «Kenia y Dany», hoja a nombre de Kenia.
7. **Johanna**: la lista solo nombra a Melissa en Producción 2. ¿Johanna ya no trabaja ahí?
   *Mientras tanto:* Melissa 100 %; Johanna sigue registrada con 0 % (no recibe trabajo).
8. **Audry o Audrey**: ¿cómo se escribe su nombre? En la app dice «Audry».
9. **Pastelitos carne, pollo y piña (Carolina o Silvia)**: confirmar que los hace completos la que esté ese día, sin dividir.
   *Mientras tanto:* área compartida «Producción 4B / 5B · Carolina o Silvia».
10. **Los 30 productos nuevos** de la lista no tienen objetivo (mínimo) por tienda. ¿Cuánto debe tener cada tienda de cada uno?

## Cuadros y cálculos

11. **MÍNIMO de los cuadros por área**: hoy es el objetivo de Principal. ¿Es eso, u otro número (por ejemplo, el mínimo a producir siempre)?
12. **RESTANTE (sobrantes)**: ¿cómo se calcula? Hoy se escribe a mano.
13. **Hojas de cada pastelera**: ¿deben tomar las batidas cambiadas a mano en el cuadro completo? (El reparto ya toma el PROD escrito por batida.)

## Objetivos que el Excel no deja leer

14. **CHEESECAKE PEQUEÑO** dice «1 CADA UNO» en todas las tiendas: ¿es 1 de cada sabor (fresa, Oreo, maracuyá), o sea 3?
    *Mientras tanto:* 1 (2 en Chalets).
15. **ELOTE en Century** dice «Y»: ¿cuánto debe ser?
    *Mientras tanto:* sin objetivo.

## Errores de fórmula en el Excel (para corregir allá)

La app hace las cuentas bien; estas diferencias son del Excel:

- **INVENTARIO DIARIO, bloque del lunes**: la columna CM de Century lee el CM de Chalets (`J3 = 'CHALETS-NO MODIFICAR'!J3`), y por eso cambia el SALDO.
- **INVENTARIO DIARIO, bloque del martes**: desde la fila 36, la columna Century lee la columna Z (la del miércoles) en vez de la R (`AB37 = 'CENTURY-  NO MODIFICAR'!Z37`).
- **INVENTARIO DIARIO, bloque del miércoles**: las filas 148 a 150 de Chalets leen la fila de abajo (`AS148 = 'CHALETS-NO MODIFICAR'!AB149`).
- **INVENTARIO DIARIO**: en las filas 22 y 73 el INV/TOTAL está escrito a mano y no suma DECO + SIN DECO.
- **Columna PRO (sugerido)**: la fila 76 apunta a la fila 77 de SUGERIDOS y la fila 77 tiene `#REF!`.

## Sistema

16. **Correos reales** de cada sucursal (para que cada encargada pueda recuperar su contraseña).
17. **Dominio propio** para la app.
