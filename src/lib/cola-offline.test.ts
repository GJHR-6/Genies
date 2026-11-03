import { describe, expect, it } from "vitest";
import {
  claveCola,
  leerCola,
  ponerEnCola,
  quitarDeCola,
  type Almacen,
  type FilaPendiente,
} from "./cola-offline";

function memoria(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
  };
}

const fila = (cambios: Partial<FilaPendiente> = {}): FilaPendiente => ({
  fecha: "2026-11-03",
  sucursal_id: 2,
  producto_id: 10,
  saldo_inicial: 4,
  ingreso: 3,
  devolucion: 0,
  pedido: 5,
  cambio: 0,
  decorado: 0,
  sin_decorar: 0,
  updated_at: "2026-11-03T14:00:00.000Z",
  updated_by: "u1",
  ...cambios,
});

describe("cola sin internet", () => {
  it("guarda y reemplaza la misma fila", () => {
    const a = memoria();
    ponerEnCola(a, "u1", fila());
    ponerEnCola(a, "u1", fila({ pedido: 8 }));
    ponerEnCola(a, "u1", fila({ producto_id: 11 }));
    const cola = leerCola(a, "u1");
    expect(cola).toHaveLength(2);
    expect(cola.find((f) => f.producto_id === 10)?.pedido).toBe(8);
  });

  it("cada usuaria tiene su cola", () => {
    const a = memoria();
    ponerEnCola(a, "u1", fila());
    expect(leerCola(a, "u2")).toEqual([]);
  });

  it("solo quita la fila si lo subido es lo último anotado", () => {
    const a = memoria();
    ponerEnCola(a, "u1", fila({ pedido: 8 }));
    quitarDeCola(a, "u1", fila({ pedido: 5 }));
    expect(leerCola(a, "u1")).toHaveLength(1);
    quitarDeCola(a, "u1", fila({ pedido: 8, updated_at: "otra hora" }));
    expect(leerCola(a, "u1")).toEqual([]);
  });

  it("ignora datos dañados o un almacén que falla", () => {
    const a = memoria();
    a.datos.set(claveCola("u1"), "no es json");
    expect(leerCola(a, "u1")).toEqual([]);
    a.datos.set(claveCola("u1"), JSON.stringify([{ fecha: "x" }, fila()]));
    expect(leerCola(a, "u1")).toHaveLength(1);

    const roto: Almacen = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("lleno");
      },
    };
    expect(leerCola(roto, "u1")).toEqual([]);
    expect(ponerEnCola(roto, "u1", fila())).toBe(false);
    expect(ponerEnCola(null, "u1", fila())).toBe(false);
  });
});
