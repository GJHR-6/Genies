import { describe, expect, it } from "vitest";
import { pasoDelDia, saludo, type EstadoDelDia } from "./paso-del-dia";

const base: EstadoDelDia = {
  esDomingo: false,
  tiendasTotal: 6,
  tiendasCerradas: 6,
  repartoHecho: false,
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

  it("todas cerraron sin reparto: sugiere revisar sugeridos", () => {
    expect(pasoDelDia(base).destacada).toBe("sugeridos");
  });

  it("reparto hecho: todo listo para imprimir, sin resaltar nada", () => {
    const p = pasoDelDia({ ...base, repartoHecho: true });
    expect(p.destacada).toBeNull();
    expect(p.tono).toBe("exito");
    expect(p.titulo).toContain("imprimir");
  });

  it("faltan tiendas manda aunque ya haya reparto", () => {
    expect(pasoDelDia({ ...base, tiendasCerradas: 5, repartoHecho: true }).destacada).toBe("tiendas");
  });
});

describe("saludo", () => {
  it("usa la hora de Tegucigalpa (UTC−6)", () => {
    expect(saludo(new Date("2026-10-16T14:00:00Z"))).toBe("Buenos días"); // 8:00
    expect(saludo(new Date("2026-10-16T20:00:00Z"))).toBe("Buenas tardes"); // 14:00
    expect(saludo(new Date("2026-10-17T02:00:00Z"))).toBe("Buenas noches"); // 20:00
  });
});
