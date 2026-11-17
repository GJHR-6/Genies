import { describe, expect, it } from "vitest";
import { esPorcion } from "./porciones";

describe("esPorcion", () => {
  it("reconoce las porciones por el nombre", () => {
    expect(esPorcion({ nombre: "Porciones VAINILLA" })).toBe(true);
    expect(esPorcion({ nombre: "Porciones de pastel de 8" })).toBe(true);
    expect(esPorcion({ nombre: "  porción TORTA PC" })).toBe(true);
  });

  it("no confunde un pastel entero", () => {
    expect(esPorcion({ nombre: "VAINILLA" })).toBe(false);
    expect(esPorcion({ nombre: "QUESADILLA ARROZ TRIGO /PORCION" })).toBe(false);
  });
});
