# Guion de la demo — lunes 26 oct 2026 (datos reales)

**Color del día:** rosado (lunes) · **Sitio:** https://genies-zeta.vercel.app
**Estado al empezar:** hoy no hay nada cargado. Ayer fue domingo, así que el
"Saldo anterior" de todas las tiendas arranca en 0: se cuenta lo real de hoy.

| Quién | Correo |
|---|---|
| Administración | admin@genies.test |
| Encargada Cypress | cypress@genies.test |

(Las contraseñas las tiene el equipo; no van en este archivo.)

⚠️ Hoy **no correr** `scripts/datos-demo.ts`, `npm run verificar` ni
`npm run e2e`: escriben sobre los datos de hoy.

## Antes de empezar (5 min)
1. **Pantalla A — compu (lo que proyectás):** entrá como **admin**. Abre en
   **Hoy**.
2. **Pantalla B — celular** (o **otro navegador**): entrá como **Cypress**. Un
   mismo navegador no puede tener dos sesiones.
3. Impresora con papel carta y una prueba hecha.

## 1. La tienda cuenta su inventario (celular · Cypress)
1. Entra directo a **Inventario de hoy**; arriba, el aviso grande del color
   del día (rosado).
2. Anotá los números reales: **Ingreso, Devolución, Pedido, Saldo y CM**. Cada
   fila se guarda sola (sirve con internet inestable). Mostrá el botón
   **Como el Excel / A–Z**.
3. Tocá **Terminé el inventario de hoy** → la pantalla queda en solo lectura.

## 3. Administración (compu · admin)
1. **Hoy**: saludo, el aviso de "qué hacer ahora" y las 4 tarjetas. Abajo,
   **Hojas para imprimir**.
2. **Tiendas**: Cypress aparece como terminada en vivo. A las que no
   capturaron, **cerrarles el día** (ver nota abajo).
3. **Sugeridos**: objetivo − saldo. Cambiá un número a mano para mostrar el
   ajuste.
4. **Cuadros**: el cuadro completo y uno por área (columnas Sin decorar y
   Hornear). Imprimí uno.
5. **Reparto**:
   1. **Hacer el reparto**: divide el trabajo por porcentaje.
   2. **Libras por batida**: si una masa pasa de 100 lb en una batida, sale
      en rojo; pasá parte a T2 para que quede bien.
      (6X2 = 1 · 8X2 = 1.75 · 9X2 = 2 · 10X2 = 2.5 · 11X2 = 3 · 9X13 = 4 lb.)
   3. **Imprimir hojas** → la hoja de cada pastelera.
6. **Hoy → Hojas para imprimir**: **Hoja completa** (igual a INVENTARIO
   DIARIO, con DEC/PROD por batida y libras) y **Hoja de cada tienda** (para
   empaque).

**Nota:** sin el paso de Principal y con solo Cypress contando, las demás
tiendas tienen saldo 0 → su sugerido es el objetivo completo. Los totales
del cuadro y las libras salen más altos que en un día normal (se nota bien
el aviso de 100 lb).

## 5. Después de la demo
- Decidir si los datos de hoy quedan como **primer día real** o se borran.
- Antes del piloto, borrar los datos demo viejos (julio, agosto y 9–21 oct)
  con `supabase/mantenimiento/limpiar-datos-demo.sql`. No toca los datos de
  hoy. Revisá los NOTICE antes del `commit`.
