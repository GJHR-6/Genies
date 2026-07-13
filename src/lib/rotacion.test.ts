import { describe, expect, it } from "vitest";
import {
  accionPorDias,
  estimarLotes,
  lotesRezagados,
  VENTANA_DIAS,
} from "./rotacion";

describe("accionPorDias", () => {
  it("0-1 días es fresco, 2 prioridad, 3+ regresar", () => {
    expect(accionPorDias(0)).toBe("fresco");
    expect(accionPorDias(1)).toBe("fresco");
    expect(accionPorDias(2)).toBe("prioridad");
    expect(accionPorDias(3)).toBe("regresar");
    expect(accionPorDias(6)).toBe("regresar");
  });
});

describe("estimarLotes", () => {
  it("saldo cubierto por el ingreso de hoy es fresco", () => {
    const lotes = estimarLotes(4, "2026-07-13", [
      { fecha: "2026-07-13", ingreso: 10 },
    ]);
    expect(lotes).toEqual([
      { fechaProduccion: "2026-07-13", unidades: 4, dias: 0 },
    ]);
  });

  it("sin ingresos recientes, el saldo viene del último día con ingreso", () => {
    // Lunes 13 con saldo 6; el último ingreso fue el jueves 9 (verde)
    const lotes = estimarLotes(6, "2026-07-13", [
      { fecha: "2026-07-09", ingreso: 8 },
    ]);
    expect(lotes).toEqual([
      { fechaProduccion: "2026-07-09", unidades: 6, dias: 4 },
    ]);
  });

  it("reparte primero en el ingreso más reciente y el resto en los previos", () => {
    const lotes = estimarLotes(7, "2026-07-13", [
      { fecha: "2026-07-13", ingreso: 5 },
      { fecha: "2026-07-11", ingreso: 10 },
    ]);
    expect(lotes).toEqual([
      { fechaProduccion: "2026-07-13", unidades: 5, dias: 0 },
      { fechaProduccion: "2026-07-11", unidades: 2, dias: 2 },
    ]);
  });

  it("lo que excede la ventana queda sin fechar", () => {
    const lotes = estimarLotes(3, "2026-07-13", []);
    expect(lotes).toEqual([
      { fechaProduccion: null, unidades: 3, dias: VENTANA_DIAS },
    ]);
  });

  it("saldo cero no genera lotes", () => {
    expect(estimarLotes(0, "2026-07-13", [])).toEqual([]);
  });
});

describe("lotesRezagados", () => {
  it("filtra lo fresco y ordena del más viejo al más nuevo", () => {
    const lotes = estimarLotes(9, "2026-07-13", [
      { fecha: "2026-07-13", ingreso: 3 },
      { fecha: "2026-07-11", ingreso: 2 },
      { fecha: "2026-07-09", ingreso: 10 },
    ]);
    expect(lotesRezagados(lotes)).toEqual([
      { fechaProduccion: "2026-07-09", unidades: 4, dias: 4 },
      { fechaProduccion: "2026-07-11", unidades: 2, dias: 2 },
    ]);
  });
});
