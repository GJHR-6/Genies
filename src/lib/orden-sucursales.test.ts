import { describe, expect, it } from "vitest";
import { ordenarSucursales } from "./orden-sucursales";

describe("ordenarSucursales", () => {
  it("usa el orden del Excel y deja las nuevas al final", () => {
    const lista = [
      { id: 1, nombre: "Principal" }, { id: 2, nombre: "Cypress" }, { id: 3, nombre: "Century" },
      { id: 4, nombre: "Altara" }, { id: 5, nombre: "Chalets" }, { id: 6, nombre: "Palenque" },
      { id: 7, nombre: "Nueva" },
    ];
    expect(ordenarSucursales(lista).map((s) => s.nombre)).toEqual([
      "Principal", "Cypress", "Chalets", "Century", "Altara", "Palenque", "Nueva",
    ]);
  });
});
