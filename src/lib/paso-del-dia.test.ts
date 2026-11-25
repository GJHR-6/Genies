import { describe, expect, it } from "vitest";
import { pasoDelDia, saludo, type EstadoDelDia } from "./paso-del-dia";

const base: EstadoDelDia = {
  esDomingo: false,
  tiendasTotal: 6,
  tiendasCerradas: 6,
};

describe("pasoDelDia", () => {
  it("domingo: no resalta nada", () => {
    expect(pasoDelDia({ ...base, esDomingo: true }).destacada).toBeNull();
  });

  it("faltan tiendas: resalta Tiendas y dice cuántas", () => {
    const p = pasoDelDia({ ...base, tiendasCerradas: 4 });
    expect(p.destacada).toBe("tiendas");
    expect(p.titulo).toContain("Faltan 2 tiendas");
    expect(pasoDelDia({ ...base, tiendasCerradas: 5 }).titulo).toContain("Falta 1 tienda");
  });

  it("todas terminaron: resalta Cuadros", () => {
    const p = pasoDelDia(base);
    expect(p.destacada).toBe("cuadros");
    expect(p.tono).toBe("exito");
  });
});

describe("saludo", () => {
  it("usa la hora de Tegucigalpa (UTC−6)", () => {
    expect(saludo(new Date("2026-10-16T14:00:00Z"))).toBe("Buenos días"); // 8:00
    expect(saludo(new Date("2026-10-16T20:00:00Z"))).toBe("Buenas tardes"); // 14:00
    expect(saludo(new Date("2026-10-17T02:00:00Z"))).toBe("Buenas noches"); // 20:00
  });
});
