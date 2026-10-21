import { describe, expect, it } from "vitest";
import {
  formatoLibras,
  formatoTandas,
  librasPorBatida,
  tandasPorProducto,
} from "./batidas";

describe("formatoTandas", () => {
  it("separa las batidas con * como el Excel", () => {
    expect(formatoTandas([39, 2, 0, 0])).toBe("39*2");
    expect(formatoTandas([0, 10, 0, 0])).toBe("0*10");
    expect(formatoTandas([10, 0, 5, 0])).toBe("10*0*5");
  });
  it("una sola batida sin *", () => {
    expect(formatoTandas([4, 0, 0, 0])).toBe("4");
  });
  it("vacío si no hay nada", () => {
    expect(formatoTandas([0, 0, 0, 0])).toBe("");
  });
});

describe("tandasPorProducto", () => {
  it("suma las pasteleras y separa por tipo", () => {
    const m = tandasPorProducto(
      [
        { producto_id: 1, tipo: "produccion", tanda: 1, cantidad: 6 },
        { producto_id: 1, tipo: "produccion", tanda: 1, cantidad: 4 },
        { producto_id: 1, tipo: "produccion", tanda: 2, cantidad: 20 },
        { producto_id: 1, tipo: "decoracion", tanda: 1, cantidad: 39 },
      ],
      "produccion"
    );
    expect(m.get(1)).toEqual([10, 20, 0, 0]);
  });
});

describe("librasPorBatida", () => {
  const productos = [
    { id: 1, categoria: "VAINILLA", libras: 1.75 },
    { id: 2, categoria: "VAINILLA", libras: 2.5 },
    { id: 3, categoria: "CHOCOLATE", libras: 2 },
    { id: 4, categoria: "QUEQUITOS", libras: null },
  ];

  it("suma libras por masa y por tanda, solo producción", () => {
    const r = librasPorBatida(
      [
        { producto_id: 1, tipo: "produccion", tanda: 1, cantidad: 20 },
        { producto_id: 2, tipo: "produccion", tanda: 1, cantidad: 10 },
        { producto_id: 2, tipo: "produccion", tanda: 2, cantidad: 4 },
        { producto_id: 1, tipo: "decoracion", tanda: 1, cantidad: 99 },
        { producto_id: 4, tipo: "produccion", tanda: 1, cantidad: 50 },
      ],
      productos
    );
    expect(r).toEqual([
      { masa: "VAINILLA", libras: [60, 10, 0, 0], excedidas: [] },
      { masa: "CHOCOLATE", libras: [0, 0, 0, 0], excedidas: [] },
    ]);
  });

  it("marca las batidas que pasan de 100 lb", () => {
    const r = librasPorBatida(
      [
        { producto_id: 1, tipo: "produccion", tanda: 1, cantidad: 40 },
        { producto_id: 2, tipo: "produccion", tanda: 1, cantidad: 13 },
        { producto_id: 1, tipo: "produccion", tanda: 3, cantidad: 57 },
      ],
      productos
    );
    // T1: 40×1.75 + 13×2.5 = 102.5 · T3: 57×1.75 = 99.75
    expect(r[0]).toEqual({
      masa: "VAINILLA",
      libras: [102.5, 0, 99.75, 0],
      excedidas: [1],
    });
  });

  it("exactamente 100 lb no se pasa", () => {
    const r = librasPorBatida(
      [{ producto_id: 3, tipo: "produccion", tanda: 2, cantidad: 50 }],
      productos
    );
    expect(r.find((m) => m.masa === "CHOCOLATE")?.excedidas).toEqual([]);
  });
});

describe("formatoLibras", () => {
  it("agrega lb y redondea a un decimal", () => {
    expect(formatoLibras([84, 60.25, 0, 0])).toBe("84*60.3 lb");
    expect(formatoLibras([0, 0, 0, 0])).toBe("");
  });
});
