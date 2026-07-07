import { describe, expect, it } from "vitest";
import { resumirDia, type SucursalBase } from "./resumen-dia";

const SUCURSALES: SucursalBase[] = [
  { id: 1, nombre: "Principal" },
  { id: 2, nombre: "Cypress" },
];

describe("resumirDia", () => {
  it("sin movimientos ni cierre → sin_iniciar", () => {
    const [principal] = resumirDia(SUCURSALES, [], []);
    expect(principal.estado).toBe("sin_iniciar");
    expect(principal.capturados).toBe(0);
    expect(principal.ultimoRegistro).toBeNull();
  });

  it("con movimientos y sin cierre → en_captura", () => {
    const resumen = resumirDia(
      SUCURSALES,
      [{ sucursal_id: 2, producto_id: 7, updated_at: "2026-07-05T15:00:00Z" }],
      []
    );
    expect(resumen.find((s) => s.id === 2)?.estado).toBe("en_captura");
    expect(resumen.find((s) => s.id === 1)?.estado).toBe("sin_iniciar");
  });

  it("cierre cerrado manda sobre los movimientos", () => {
    const resumen = resumirDia(
      SUCURSALES,
      [{ sucursal_id: 2, producto_id: 7, updated_at: "2026-07-05T15:00:00Z" }],
      [{ sucursal_id: 2, estado: "cerrado" }]
    );
    expect(resumen.find((s) => s.id === 2)?.estado).toBe("cerrado");
  });

  it("cierre reabierto (en_captura) no cuenta como cerrado", () => {
    const resumen = resumirDia(SUCURSALES, [], [
      { sucursal_id: 2, estado: "en_captura" },
    ]);
    expect(resumen.find((s) => s.id === 2)?.estado).toBe("sin_iniciar");
  });

  it("cuenta productos distintos y toma el último registro", () => {
    const [, cypress] = resumirDia(
      SUCURSALES,
      [
        { sucursal_id: 2, producto_id: 7, updated_at: "2026-07-05T15:00:00Z" },
        { sucursal_id: 2, producto_id: 7, updated_at: "2026-07-05T16:30:00Z" },
        { sucursal_id: 2, producto_id: 9, updated_at: "2026-07-05T14:00:00Z" },
      ],
      []
    );
    expect(cypress.capturados).toBe(2);
    expect(cypress.ultimoRegistro).toBe("2026-07-05T16:30:00Z");
  });
});
