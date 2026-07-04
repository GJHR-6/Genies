# Flujo de la aplicaciÃ³n â€” Sistema Genies

**VersiÃ³n:** 1.0

---

## 1. Flujo maestro del dÃ­a (extremo a extremo)

```
 MAÃ‘ANA (cada sucursal)                    TARDE (administraciÃ³n)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 1. Encargada hace login  â”‚             â”‚ 5. Admin ve dashboard:        â”‚
â”‚ 2. Abre "Captura del dÃ­a"â”‚             â”‚    6 sucursales âœ“ completas   â”‚
â”‚ 3. Registra por producto:â”‚  Realtime   â”‚ 6. Revisa/ajusta sugeridos    â”‚
â”‚    ingreso, devoluciÃ³n,  â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º â”‚ 7. Genera cuadros de          â”‚
â”‚    pedido (+ decoraciÃ³n  â”‚             â”‚    producciÃ³n por depto.      â”‚
â”‚    en Principal)         â”‚             â”‚ 8. Imprime y entrega a        â”‚
â”‚ 4. Marca dÃ­a completo    â”‚             â”‚    producciÃ³n                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚                                          â”‚
         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ el sistema calcula â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              saldo, vendido y sugerido (vistas SQL)
```

## 2. Flujo de autenticaciÃ³n

```
Usuario â†’ /login
  â”œâ”€ credenciales vÃ¡lidas â†’ Supabase Auth â†’ carga perfil (rol + sucursal)
  â”‚     â”œâ”€ rol tienda/principal â†’ redirect /captura
  â”‚     â””â”€ rol admin            â†’ redirect /dashboard
  â””â”€ invÃ¡lidas â†’ mensaje de error, sin revelar si el email existe
Middleware (Next.js): toda ruta bajo (app)/ exige sesiÃ³n;
rutas de admin exigen rol admin (ademÃ¡s del RLS en BD).
```

## 3. Flujo de captura diaria (tienda)

```
/captura
  1. El sistema resuelve "hoy" (America/Tegucigalpa) y la sucursal del perfil
  2. Carga movimientos existentes del dÃ­a (si reingresÃ³, continÃºa donde iba)
  3. Por cada producto editado:
       on blur â†’ upsert a movimientos_diarios
         â”œâ”€ Ã©xito â†’ badge "Guardado âœ“"
         â””â”€ fallo de red â†’ cola de reintento (TanStack Query)
                â†’ badge "Pendiente âŸ³" â†’ reintenta al volver conexiÃ³n
  4. "Marcar dÃ­a completo" â†’ valida productos clave sin capturar â†’ confirma
  5. DespuÃ©s del cierre, la tienda ve el dÃ­a en modo lectura
     (solo admin puede reabrir/corregir)
```

**Regla de negocio:** `vendido` nunca se digita. Se calcula:
`vendido = saldo_anterior + ingreso âˆ’ devoluciÃ³n âˆ’ saldo_final`.

## 4. Flujo de sugeridos y cuadros (admin)

```
/dashboard
  1. Tarjetas por sucursal con estado en tiempo real
  2. Cuando el dÃ­a estÃ¡ completo â†’ /sugeridos
       - vista v_sugeridos: sugerido = objetivo âˆ’ saldo (por producto Ã— sucursal)
       - admin puede sobreescribir valores puntuales (override del dÃ­a)
  3. â†’ /cuadros
       - genera un cuadro por departamento con las cantidades a producir
         (y decorar, para los productos que llevan decoraciÃ³n)
       - vista imprimible â†’ imprimir â†’ fin del ciclo diario
```

## 5. Flujo de administraciÃ³n de catÃ¡logos

```
/catalogos (solo admin)
  â”œâ”€ Productos: alta/baja/ediciÃ³n (nombre, tamaÃ±o, categorÃ­a, departamento,
  â”‚             lleva_decoracion)
  â”œâ”€ Departamentos: alta/baja
  â”œâ”€ Reglas de sugerido: objetivo por producto Ã— sucursal Ã— dÃ­a de semana
  â””â”€ Usuarios: crear encargadas, asignar rol y sucursal
```

## 6. Diagrama de estados del dÃ­a por sucursal

```
SIN_INICIAR â”€â”€primer registroâ”€â”€â–º EN_CAPTURA â”€â”€"dÃ­a completo"â”€â”€â–º CERRADO
                                     â–²                             â”‚
                                     â””â”€â”€â”€â”€â”€â”€â”€â”€admin reabreâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## 7. Manejo de errores y bordes

| SituaciÃ³n | Comportamiento |
|---|---|
| Se cae internet a mitad de captura | Los cambios quedan encolados; reintento automÃ¡tico; nada se pierde al recargar si ya se guardÃ³ |
| Dos personas editan la misma fila | Last-write-wins + toast informativo (MVP) |
| Encargada olvida cerrar el dÃ­a | El dashboard lo muestra "En captura"; admin puede cerrar por ella |
| CorrecciÃ³n de un dÃ­a pasado | Solo admin; queda `updated_at` y `updated_by` para trazabilidad |
| Producto nuevo a mitad de semana | Admin lo crea en catÃ¡logo; aparece en la captura del dÃ­a siguiente (o del mismo dÃ­a al recargar) |
