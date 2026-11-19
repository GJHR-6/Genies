import { describe, expect, it } from "vitest";
import { aMandar, cuentaEnTotalSeccion, filaHojaCompleta, sumarFilas } from "./hoja-completa";

const celda = (sugerido: number) => ({
  objetivo: sugerido,
  saldo: 0,
  sugerido,
  esOverride: false,
  conCaptura: true,
});

const dia = {
  // El sugerido es solo referencia: lo que se manda es el pedido.
  celdas: { "1-20": celda(9), "1-30": celda(4), "2-20": celda(3) },
  pedidos: { "1-20": 5, "1-30": 4, "2-20": 3 },
  mandarOverride: {} as Record<string, number>,
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
      { sucursalId: 20, mandar: 5, cm: null, sugerido: 9, ajustado: false, arrastre: 0 },
      { sucursalId: 30, mandar: 4, cm: 2, sugerido: 4, ajustado: false, arrastre: 0 },
    ]);
    expect(f.saldo).toBe(14 + 2 - 5 - 4);
  });

  it("lo que se manda: ajuste del admin > pedido > nada", () => {
    const conAjuste = { ...dia, mandarOverride: { "1-20": 0 } };
    expect(aMandar(conAjuste, "1-20")).toEqual({ mandar: 0, ajustado: true, arrastre: 0 });
    expect(aMandar(conAjuste, "1-30")).toEqual({ mandar: 4, ajustado: false, arrastre: 0 });
    expect(aMandar(conAjuste, "3-20")).toEqual({ mandar: null, ajustado: false, arrastre: 0 });
    const f = filaHojaCompleta(conAjuste, { id: 1, lleva_decoracion: true }, tiendas);
    expect(f.saldo).toBe(14 + 2 - 0 - 4);
  });

  it("sin decoración: el inventario de Principal va en DECO", () => {
    const f = filaHojaCompleta(dia, { id: 2, lleva_decoracion: false }, tiendas);
    expect(f.deco).toBe(10);
    expect(f.sinDeco).toBeNull();
    expect(f.invTotal).toBe(10);
    expect(f.tiendas[1]).toEqual({ sucursalId: 30, mandar: null, cm: null, sugerido: null, ajustado: false, arrastre: 0 });
    expect(f.saldo).toBe(7);
  });

  it("sin inventario anotado: SALDO negativo = lo que falta", () => {
    const f = filaHojaCompleta(dia, { id: 3, lleva_decoracion: false }, tiendas);
    expect(f.invTotal).toBeNull();
    expect(f.saldo).toBe(0);
  });

  it("sin decoración pero con Deco / Sin deco anotados: se usan en vez del saldo", () => {
    const anotado = { ...dia, decorado: { 2: 4 }, sinDecorar: { 2: 3 } };
    const f = filaHojaCompleta(anotado, { id: 2, lleva_decoracion: false }, tiendas);
    expect(f.deco).toBe(4);
    expect(f.sinDeco).toBe(3);
    expect(f.invTotal).toBe(7);
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
      { sucursalId: 20, mandar: 8, cm: null, sugerido: 12, ajustado: false, arrastre: 0 },
      { sucursalId: 30, mandar: 4, cm: 2, sugerido: 4, ajustado: false, arrastre: 0 },
    ]);
    expect(t.saldo).toBe(a.saldo + b.saldo);
  });

  it("lo que no salió el día anterior se suma a lo que se manda", () => {
    const dia = { pedidos: { "1-20": 10, "1-30": 4 }, mandarOverride: { "1-30": 6 }, arrastre: { "1-20": 2, "1-30": 1, "2-20": 3 } };
    expect(aMandar(dia, "1-20")).toEqual({ mandar: 12, ajustado: false, arrastre: 2 });
    // Sin pedido hoy: igual se manda lo de ayer.
    expect(aMandar(dia, "2-20")).toEqual({ mandar: 3, ajustado: false, arrastre: 3 });
    // El ajuste del admin es el total final.
    expect(aMandar(dia, "1-30")).toEqual({ mandar: 6, ajustado: true, arrastre: 0 });
  });
});
