import { describe, expect, it } from "vitest";
import { cuentaEnTotalSeccion, filaHojaCompleta, sumarFilas } from "./hoja-completa";

const celda = (sugerido: number) => ({
  objetivo: sugerido,
  saldo: 0,
  sugerido,
  esOverride: false,
  conCaptura: true,
});

const dia = {
  celdas: { "1-20": celda(5), "1-30": celda(4), "2-20": celda(3) },
  sinDecorar: { 1: 6 },
  decorado: { 1: 8 },
  cambios: { "1-30": 2 },
  saldoPrincipal: { 1: 99, 2: 10 },
  principalId: 10,
};
const tiendas = [{ id: 20 }, { id: 30 }];

describe("filaHojaCompleta", () => {
  it("pastel con decoración: INV = deco + sin deco; SALDO = INV + CM − mandar", () => {
    const f = filaHojaCompleta(dia, { id: 1, lleva_decoracion: true }, tiendas);
    expect(f.deco).toBe(8);
    expect(f.sinDeco).toBe(6);
    expect(f.invTotal).toBe(14);
    expect(f.tiendas).toEqual([
      { sucursalId: 20, mandar: 5, cm: null },
      { sucursalId: 30, mandar: 4, cm: 2 },
    ]);
    expect(f.saldo).toBe(14 + 2 - 5 - 4);
  });

  it("sin decoración: el inventario de Principal va en DECO", () => {
    const f = filaHojaCompleta(dia, { id: 2, lleva_decoracion: false }, tiendas);
    expect(f.deco).toBe(10);
    expect(f.sinDeco).toBeNull();
    expect(f.invTotal).toBe(10);
    expect(f.tiendas[1]).toEqual({ sucursalId: 30, mandar: null, cm: null });
    expect(f.saldo).toBe(7);
  });

  it("sin inventario anotado: SALDO negativo = lo que falta", () => {
    const f = filaHojaCompleta(dia, { id: 3, lleva_decoracion: false }, tiendas);
    expect(f.invTotal).toBeNull();
    expect(f.saldo).toBe(0);
  });
});

describe("total de sección", () => {
  it("las porciones no cuentan", () => {
    expect(cuentaEnTotalSeccion({ nombre: "Porciones VAINILLA" })).toBe(false);
    expect(cuentaEnTotalSeccion({ nombre: "VAINILLA" })).toBe(true);
  });

  it("suma columna por columna; vacío + vacío sigue vacío", () => {
    const a = filaHojaCompleta(dia, { id: 1, lleva_decoracion: true }, tiendas);
    const b = filaHojaCompleta(dia, { id: 2, lleva_decoracion: false }, tiendas);
    const t = sumarFilas([a, b]);
    expect(t.deco).toBe(18);
    expect(t.sinDeco).toBe(6);
    expect(t.invTotal).toBe(24);
    expect(t.tiendas).toEqual([
      { sucursalId: 20, mandar: 5 + (b.tiendas[0].mandar ?? 0), cm: b.tiendas[0].cm },
      { sucursalId: 30, mandar: 4, cm: 2 },
    ]);
    expect(t.saldo).toBe(a.saldo + b.saldo);
  });
});
