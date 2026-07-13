import { describe, expect, it } from "vitest";
import { colorDelDia } from "./color-dia";

describe("colorDelDia", () => {
  it("asigna el color de cada día de producción", () => {
    // Semana del 13 al 18 de julio de 2026 (lunes a sábado)
    expect(colorDelDia("2026-07-13")?.nombre).toBe("Rosado");
    expect(colorDelDia("2026-07-14")?.nombre).toBe("Azul");
    expect(colorDelDia("2026-07-15")?.nombre).toBe("Naranja");
    expect(colorDelDia("2026-07-16")?.nombre).toBe("Verde");
    expect(colorDelDia("2026-07-17")?.nombre).toBe("Amarillo");
    expect(colorDelDia("2026-07-18")?.nombre).toBe("Negro");
  });

  it("domingo no hay producción: sin color", () => {
    expect(colorDelDia("2026-07-12")).toBeNull();
    expect(colorDelDia("2026-07-19")).toBeNull();
  });

  it("cada color define fondo y texto legibles", () => {
    for (const fecha of ["2026-07-13", "2026-07-17", "2026-07-18"]) {
      const color = colorDelDia(fecha);
      expect(color?.fondo).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color?.texto).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
