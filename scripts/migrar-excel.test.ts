import { describe, expect, it } from "vitest";
import { parsearSugerido } from "./migrar-excel";

// Días: 0=domingo 1=lunes 2=martes 3=miércoles 4=jueves 5=viernes 6=sábado

describe("parsearSugerido", () => {
  it("número simple → regla diaria", () => {
    expect(parsearSugerido(12).porDia).toEqual([{ dia: null, objetivo: 12 }]);
  });

  it("'12 DIARIOS' → regla diaria", () => {
    expect(parsearSugerido("12 DIARIOS").porDia).toEqual([
      { dia: null, objetivo: 12 },
    ]);
  });

  it("cero, vacío o null → sin regla", () => {
    expect(parsearSugerido(0).porDia).toEqual([]);
    expect(parsearSugerido("0").porDia).toEqual([]);
    expect(parsearSugerido("").porDia).toEqual([]);
    expect(parsearSugerido(null).porDia).toEqual([]);
  });

  it("'4 M-J / 2 V-L' → martes-jueves 4, viernes-lunes 2", () => {
    const { porDia } = parsearSugerido("4 M-J / 2 V-L");
    const porDiaMap = new Map(porDia.map((r) => [r.dia, r.objetivo]));
    expect(porDiaMap.get(2)).toBe(4);
    expect(porDiaMap.get(3)).toBe(4);
    expect(porDiaMap.get(4)).toBe(4);
    expect(porDiaMap.get(5)).toBe(2);
    expect(porDiaMap.get(6)).toBe(2);
    expect(porDiaMap.get(0)).toBe(2);
    expect(porDiaMap.get(1)).toBe(2);
    expect(porDia).toHaveLength(7);
  });

  it("'6M-J/V-L8' (orden invertido) → mismo resultado", () => {
    const porDiaMap = new Map(
      parsearSugerido("6M-J/V-L8").porDia.map((r) => [r.dia, r.objetivo])
    );
    expect(porDiaMap.get(3)).toBe(6);
    expect(porDiaMap.get(0)).toBe(8);
  });

  it("'8 S/D 12' → lunes-viernes 8, fin de semana 12", () => {
    const porDiaMap = new Map(
      parsearSugerido("8 S/D 12").porDia.map((r) => [r.dia, r.objetivo])
    );
    expect(porDiaMap.get(1)).toBe(8);
    expect(porDiaMap.get(5)).toBe(8);
    expect(porDiaMap.get(6)).toBe(12);
    expect(porDiaMap.get(0)).toBe(12);
  });

  it("'1V/2S' → solo viernes y sábado", () => {
    expect(parsearSugerido("1V/2S").porDia).toEqual([
      { dia: 5, objetivo: 1 },
      { dia: 6, objetivo: 2 },
    ]);
  });

  it("'2 Y 2' → suma con advertencia (producto combinado)", () => {
    const r = parsearSugerido("2 Y 2");
    expect(r.porDia).toEqual([{ dia: null, objetivo: 4 }]);
    expect(r.advertencia).toBeDefined();
  });

  it("'24 / 12' → suma con advertencia", () => {
    const r = parsearSugerido("24 / 12");
    expect(r.porDia).toEqual([{ dia: null, objetivo: 36 }]);
    expect(r.advertencia).toBeDefined();
  });

  it("texto ilegible → sin regla con advertencia", () => {
    const r = parsearSugerido("Y");
    expect(r.porDia).toEqual([]);
    expect(r.advertencia).toContain("ilegible");
  });

  it("decimales de Excel se redondean", () => {
    expect(parsearSugerido(11.999999).porDia).toEqual([
      { dia: null, objetivo: 12 },
    ]);
  });
});
