import { describe, expect, it } from "vitest";
import { diaAnterior, fechaElegida, formatoLargo, hoyTegucigalpa } from "./fechas";

describe("diaAnterior", () => {
  it("resta un día dentro del mes", () => {
    expect(diaAnterior("2026-07-05")).toBe("2026-07-04");
  });
  it("cruza inicio de mes", () => {
    expect(diaAnterior("2026-07-01")).toBe("2026-06-30");
  });
  it("cruza inicio de año", () => {
    expect(diaAnterior("2026-01-01")).toBe("2025-12-31");
  });
  it("respeta año bisiesto", () => {
    expect(diaAnterior("2024-03-01")).toBe("2024-02-29");
    expect(diaAnterior("2026-03-01")).toBe("2026-02-28");
  });
});

describe("hoyTegucigalpa", () => {
  it("devuelve formato ISO YYYY-MM-DD", () => {
    expect(hoyTegucigalpa()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatoLargo", () => {
  it("formatea en español sin corrimiento de zona", () => {
    const texto = formatoLargo("2026-07-04");
    expect(texto).toContain("julio");
    expect(texto).toContain("2026");
    expect(texto).toContain("4");
    expect(texto.toLowerCase()).toContain("sábado");
  });
});

describe("fechaElegida", () => {
  it("usa la fecha pedida si es válida y no es futura", () => {
    expect(fechaElegida("2026-11-02", "2026-11-04")).toBe("2026-11-02");
    expect(fechaElegida(undefined, "2026-11-04")).toBe("2026-11-04");
    expect(fechaElegida("2026-11-09", "2026-11-04")).toBe("2026-11-04");
    expect(fechaElegida("2026-02-30", "2026-11-04")).toBe("2026-11-04");
    expect(fechaElegida("ayer", "2026-11-04")).toBe("2026-11-04");
  });
});
