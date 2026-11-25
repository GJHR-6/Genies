import { describe, expect, it } from "vitest";
import { ordenarProductos } from "./orden-productos";

describe("ordenarProductos", () => {
  it("manda el orden del Excel; los sin posición van al final", () => {
    const r = ordenarProductos([
      { nombre: "B", orden: null, categoria: "Z" },
      { nombre: "MIXTO", orden: 20 },
      { nombre: "VAINILLA", orden: 3 },
      { nombre: "A", orden: null, categoria: "Z" },
    ]);
    expect(r.map((p) => p.nombre)).toEqual(["VAINILLA", "MIXTO", "A", "B"]);
  });
});
