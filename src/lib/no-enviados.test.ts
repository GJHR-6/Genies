import { describe, expect, it } from "vitest";
import {
  arrastre,
  cantidadNoEnviada,
  cuandoFue,
  diaProduccionAnterior,
  pendientes,
  pendientesPorTienda,
} from "./no-enviados";

describe("lo que no se mandó", () => {
  it("lee la casilla: vacío o 0 = se mandó todo; nunca más de lo pedido", () => {
    expect(cantidadNoEnviada("", 10)).toBeNull();
    expect(cantidadNoEnviada("0", 10)).toBeNull();
    expect(cantidadNoEnviada("3", 10)).toBe(3);
    expect(cantidadNoEnviada("25", 10)).toBe(10);
    expect(cantidadNoEnviada("4a", 10)).toBe(4);
  });

  it("pendientes: solo los no mandados, del más viejo al más nuevo", () => {
    const r = [
      { fecha: "2026-11-03", enviado_at: null, id: 1 },
      { fecha: "2026-11-01", enviado_at: null, id: 2 },
      { fecha: "2026-11-02", enviado_at: "2026-11-02T20:00:00Z", id: 3 },
    ];
    expect(pendientes(r).map((x) => x.id)).toEqual([2, 1]);
  });

  it("suma lo pendiente por tienda", () => {
    const total = pendientesPorTienda([
      { sucursal_id: 2, cantidad: 3, enviado_at: null },
      { sucursal_id: 2, cantidad: 2, enviado_at: null },
      { sucursal_id: 3, cantidad: 5, enviado_at: "x" },
    ]);
    expect(total.get(2)).toBe(5);
    expect(total.has(3)).toBe(false);
  });

  it("dice cuándo fue", () => {
    expect(cuandoFue("2026-11-03", "2026-11-03")).toBe("hoy");
    expect(cuandoFue("2026-11-02", "2026-11-03")).toBe("ayer");
    expect(cuandoFue("2026-10-31", "2026-11-03")).toMatch(/31/);
  });
});

describe("diaProduccionAnterior", () => {
  it("es el día anterior, y el lunes es el sábado (el domingo no hay producción)", () => {
    expect(diaProduccionAnterior("2026-11-19")).toBe("2026-11-18");
    expect(diaProduccionAnterior("2026-11-16")).toBe("2026-11-14");
    expect(diaProduccionAnterior("2026-11-17")).toBe("2026-11-16");
  });
});

describe("arrastre", () => {
  it("suma lo que no salió y no se mandó después", () => {
    expect(
      arrastre([
        { producto_id: 1, sucursal_id: 2, cantidad: 2, enviado_at: null },
        { producto_id: 3, sucursal_id: 2, cantidad: 4, enviado_at: "2026-11-18T20:00:00Z" },
        { producto_id: 1, sucursal_id: 5, cantidad: 1, enviado_at: null },
      ])
    ).toEqual({ "1-2": 2, "1-5": 1 });
  });
});
