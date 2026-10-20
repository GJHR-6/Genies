import { describe, expect, it } from "vitest";
import { totalesPorProducto, type ProductoSugerido } from "./sugeridos";

const producto = (id: number, lleva_decoracion: boolean): ProductoSugerido => ({
  id,
  nombre: `P${id}`,
  tamano: null,
  categoria: null,
  departamento_id: null,
  area_id: 1,
  orden_area: id,
  lleva_decoracion,
});

const celda = (sugerido: number) => ({
  objetivo: sugerido,
  saldo: 0,
  sugerido,
  esOverride: false,
  conCaptura: true,
});

describe("totalesPorProducto", () => {
  const dia = {
    productos: [producto(1, true), producto(2, false), producto(3, true)],
    sucursales: [
      { id: 10, nombre: "Principal" },
      { id: 20, nombre: "Cypress" },
    ],
    celdas: {
      "1-10": celda(6),
      "1-20": celda(4),
      "2-10": celda(3),
      "3-20": celda(2),
    },
    // 2 no lleva decoración: su sin decorar se ignora
    sinDecorar: { 1: 7, 2: 5, 3: 9 },
  };

  it("descuenta lo sin decorar de la producción, no de la decoración", () => {
    const t = totalesPorProducto(dia);
    expect(t.get(1)).toEqual({ total: 10, sinDecorar: 7, aProducir: 3, aDecorar: 10 });
  });

  it("sin decoración: produce el total y no decora", () => {
    const t = totalesPorProducto(dia);
    expect(t.get(2)).toEqual({ total: 3, sinDecorar: 0, aProducir: 3, aDecorar: 0 });
  });

  it("si sobra sin decorar, no produce nada (nunca negativo)", () => {
    const t = totalesPorProducto(dia);
    expect(t.get(3)).toEqual({ total: 2, sinDecorar: 9, aProducir: 0, aDecorar: 2 });
  });
});
