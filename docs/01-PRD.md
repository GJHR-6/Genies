# PRD â€” Documento de Requerimientos de Producto
## Sistema de inventario y producciÃ³n diaria â€” Genies

**VersiÃ³n:** 1.0 Â· **Estado:** Aprobado para desarrollo Â· **Alcance contratado:** OpciÃ³n 2 (MVP + automatizaciÃ³n de formatos actuales)

---

## 1. Contexto y problema

Genies es una pastelerÃ­a en Honduras con **6 sucursales** (Principal, Cypress, Century, Altara, Chalets, Palenque). Hoy el inventario diario se maneja en un archivo Excel (`PRINCIPAL_Auto_inventario_diario.xlsx`) con bloques de columnas por dÃ­a, y la administradora llena **a mano** los cuadros de producciÃ³n de cada departamento â€” un proceso que toma mÃ¡s de una hora diaria y es la principal fuente de errores.

## 2. Objetivo

Reemplazar el proceso manual por un sistema web centralizado donde:

1. Cada tienda registra su inventario diario **una sola vez** (ingresos, devoluciones, pedido).
2. El sistema calcula automÃ¡ticamente saldos, vendidos y **producciÃ³n sugerida**.
3. La administradora genera e imprime los **cuadros de producciÃ³n por departamento con un clic**.

### Resultados medibles
- Reducir el tiempo del cierre diario de +1 hora a menos de 15 minutos.
- Eliminar el llenado manual de cuadros de producciÃ³n (0 transcripciones).
- Un solo dato fuente: cada cifra se digita una vez y fluye a todos los reportes.

## 3. Usuarios y roles

| Rol | QuiÃ©n es | QuÃ© puede hacer |
|---|---|---|
| `tienda` | Encargada de cada sucursal | Registrar movimientos diarios **solo de su sucursal**; ver su historial |
| `principal` | Encargada de la sucursal Principal | Lo mismo que tienda + registro de producto **decorado / sin decorar** |
| `admin` | Administradora / dueÃ±a | Ve y edita todo; genera cuadros de producciÃ³n; gestiona catÃ¡logos y reglas de sugeridos |

## 4. Funcionalidades del MVP (Fase 1 â€” en alcance)

### 4.1 AutenticaciÃ³n y perfiles
- Login con email/contraseÃ±a (Supabase Auth).
- Cada usuario estÃ¡ vinculado a una sucursal y un rol.

### 4.2 Captura diaria por sucursal
- Formulario de movimientos del dÃ­a: por producto â†’ **ingreso, devoluciÃ³n, pedido**.
- **Vendido es calculado**, no digitado: `vendido = saldo_anterior + ingreso âˆ’ devoluciÃ³n âˆ’ saldo_actual`.
- En Principal: campos adicionales de decoraciÃ³n (`decorado` / `sin_decorar`).
- EdiciÃ³n permitida solo del dÃ­a en curso (admin puede corregir dÃ­as anteriores).

### 4.3 Sugeridos
- El sistema muestra la **producciÃ³n sugerida** por producto Ã— sucursal Ã— dÃ­a: `sugerido = objetivo âˆ’ saldo`.
- Los objetivos provienen de la tabla `reglas_sugerido` (migrada del Excel).
- En el MVP el sugerido es **referencia editable** â€” la admin puede ajustarlo antes de generar cuadros.

### 4.4 Cuadros de producciÃ³n por departamento
- Con el inventario del dÃ­a capturado, la admin genera los cuadros de cada departamento automÃ¡ticamente.
- Vista **imprimible** (formato limpio para papel, replica los formatos actuales).

### 4.5 Reporte diario y cierre
- Saldo e historial por sucursal en tiempo real.
- Vista consolidada para admin de las 6 sucursales.

### 4.6 Resiliencia de conexiÃ³n (offline ligero)
- Si se cae la seÃ±al al guardar, la app **reintenta automÃ¡ticamente** cuando vuelve la conexiÃ³n.
- No se requiere modo offline completo (decisiÃ³n confirmada con el cliente).

## 5. Fuera de alcance (fases futuras)

- **Fase 2:** sugeridos inteligentes (reporte de tendencias: "subiÃ³ la venta de X, el sugerido deberÃ­a aumentar a Y"), reportes histÃ³ricos avanzados, transferencias entre sucursales.
- **Fase 3:** punto de venta / facturaciÃ³n (proyecto aparte).

## 6. Supuestos y dependencias

- 6 sucursales confirmadas; el catÃ¡logo de productos, la lista de departamentos y el volcado de reglas de sugeridos **se migran desde el Excel del cliente** (pendiente de carga â€” ver plan de implementaciÃ³n, hito M2).
- Internet inestable en algunas sucursales â†’ diseÃ±o resiliente pero no offline-first.
- Idioma de la interfaz: **espaÃ±ol**. Uso principal: celular/tablet en tienda, computadora en administraciÃ³n.

## 7. Criterios de aceptaciÃ³n del MVP

1. Una encargada puede registrar el inventario completo de su tienda desde el celular en < 10 min.
2. Una tienda **no puede** ver ni editar datos de otra sucursal (validado con RLS).
3. La admin genera e imprime los cuadros de los departamentos sin transcribir ningÃºn nÃºmero.
4. Los sugeridos coinciden con las reglas actuales del Excel para los casos de prueba acordados.
5. Si se pierde la conexiÃ³n al guardar, el registro no se pierde y se sincroniza al volver la seÃ±al.
