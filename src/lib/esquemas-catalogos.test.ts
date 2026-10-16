import { describe, expect, it } from "vitest";
import {
  esquemaNuevoUsuario,
  esquemaPerfil,
  esquemaProducto,
  esquemaReglas,
  primerError,
} from "./esquemas-catalogos";

const productoBase = {
  nombre: "  VAINILLA ",
  tamano: "",
  categoria: "VAINILLA",
  departamento_id: 1,
  area_id: null,
  orden_area: null,
  lleva_decoracion: true,
  activo: true,
};

describe("esquemaProducto", () => {
  it("recorta el nombre y guarda tamaño vacío como null", () => {
    const r = esquemaProducto.parse(productoBase);
    expect(r.nombre).toBe("VAINILLA");
    expect(r.tamano).toBeNull();
  });

  it("exige nombre", () => {
    const r = esquemaProducto.safeParse({ ...productoBase, nombre: "   " });
    expect(r.success).toBe(false);
    if (!r.success) expect(primerError(r.error)).toBe("Escribí el nombre.");
  });
});

describe("esquemaReglas", () => {
  it("acepta 'todos los días' (null) y borrar (objetivo null)", () => {
    const r = esquemaReglas.safeParse({
      producto_id: 3,
      cambios: [
        { sucursal_id: 1, dia_semana: null, objetivo: 12 },
        { sucursal_id: 2, dia_semana: 6, objetivo: null },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza días fuera de 0–6 y objetivos negativos", () => {
    expect(
      esquemaReglas.safeParse({
        producto_id: 3,
        cambios: [{ sucursal_id: 1, dia_semana: 7, objetivo: 1 }],
      }).success
    ).toBe(false);
    expect(
      esquemaReglas.safeParse({
        producto_id: 3,
        cambios: [{ sucursal_id: 1, dia_semana: 1, objetivo: -1 }],
      }).success
    ).toBe(false);
  });
});

describe("perfiles", () => {
  const uuid = "6f1c1f3e-8a43-4c4b-9a0e-2a3b4c5d6e7f";

  it("tienda y principal necesitan sucursal; admin no", () => {
    const tienda = esquemaPerfil.safeParse({
      user_id: uuid,
      nombre: "Ana",
      rol: "tienda",
      sucursal_id: null,
    });
    expect(tienda.success).toBe(false);
    if (!tienda.success)
      expect(primerError(tienda.error)).toBe("Elegí la sucursal de esta persona.");

    expect(
      esquemaPerfil.safeParse({
        user_id: uuid,
        nombre: "Admin",
        rol: "admin",
        sucursal_id: null,
      }).success
    ).toBe(true);
  });

  it("normaliza el correo y exige contraseña de 8+", () => {
    const ok = esquemaNuevoUsuario.parse({
      email: "  Cypress@Genies.TEST ",
      contrasena: "12345678",
      nombre: "Encargada",
      rol: "tienda",
      sucursal_id: 2,
    });
    expect(ok.email).toBe("cypress@genies.test");

    expect(
      esquemaNuevoUsuario.safeParse({
        email: "cypress@genies.test",
        contrasena: "corta",
        nombre: "Encargada",
        rol: "tienda",
        sucursal_id: 2,
      }).success
    ).toBe(false);
  });
});
