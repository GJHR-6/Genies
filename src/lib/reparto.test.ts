import { describe, expect, it } from "vitest";
import {
  diaDelAnio,
  generarReparto,
  repartirEntero,
  resumirAvance,
  sumaPorcentajesPorArea,
  titularDeArea,
  type PasteleraReparto,
} from "./reparto";

const suma = (m: Map<number, number>) =>
  [...m.values()].reduce((s, v) => s + v, 0);

describe("repartirEntero", () => {
  it("10 al 50/50 → 5 y 5", () => {
    const r = repartirEntero(10, [
      { id: 1, porcentaje: 50 },
      { id: 2, porcentaje: 50 },
    ]);
    expect(r.get(1)).toBe(5);
    expect(r.get(2)).toBe(5);
  });

  it("11 al 50/50: el sobrante rota según el día", () => {
    const pesos = [
      { id: 1, porcentaje: 50 },
      { id: 2, porcentaje: 50 },
    ];
    const hoy = repartirEntero(11, pesos, 0);
    const manana = repartirEntero(11, pesos, 1);
    expect(suma(hoy)).toBe(11);
    expect(suma(manana)).toBe(11);
    expect(hoy.get(1)).toBe(6);
    expect(manana.get(2)).toBe(6);
  });

  it("respeta porcentajes fijos (60/40)", () => {
    const r = repartirEntero(10, [
      { id: 1, porcentaje: 60 },
      { id: 2, porcentaje: 40 },
    ]);
    expect(r.get(1)).toBe(6);
    expect(r.get(2)).toBe(4);
  });

  it("siempre suma exactamente el total, aunque los % no den 100", () => {
    for (let total = 0; total < 60; total++) {
      const r = repartirEntero(
        total,
        [
          { id: 1, porcentaje: 33 },
          { id: 2, porcentaje: 33 },
          { id: 3, porcentaje: 20 },
        ],
        total
      );
      expect(suma(r)).toBe(total);
    }
  });

  it("el mayor residuo gana sobre la rotación", () => {
    // 7 × 70/30 = 4.9 / 2.1 → 5 / 2 sin importar la rotación
    for (const rot of [0, 1]) {
      const r = repartirEntero(
        7,
        [
          { id: 1, porcentaje: 70 },
          { id: 2, porcentaje: 30 },
        ],
        rot
      );
      expect(r.get(1)).toBe(5);
      expect(r.get(2)).toBe(2);
    }
  });

  it("porcentaje 0 no recibe nada", () => {
    const r = repartirEntero(5, [
      { id: 1, porcentaje: 100 },
      { id: 2, porcentaje: 0 },
    ]);
    expect(r.get(1)).toBe(5);
    expect(r.get(2)).toBe(0);
  });
});

describe("diaDelAnio", () => {
  it("1 de enero = 1, 15 de octubre de 2026 = 288", () => {
    expect(diaDelAnio("2026-01-01")).toBe(1);
    expect(diaDelAnio("2026-10-15")).toBe(288);
  });
});

const pasteleras: PasteleraReparto[] = [
  { id: 1, area_id: 1, porcentaje: 50, orden: 1, activa: true },
  { id: 2, area_id: 1, porcentaje: 50, orden: 2, activa: true },
  { id: 3, area_id: 2, porcentaje: 100, orden: 1, activa: true },
  { id: 9, area_id: 2, porcentaje: 100, orden: 2, activa: false },
];

describe("generarReparto", () => {
  it("reparte por área, en tanda 1, y deja sin asignar lo que no tiene área", () => {
    const filas = generarReparto({
      fecha: "2026-10-15",
      productos: [
        { id: 10, area_id: 1, lleva_decoracion: false },
        { id: 20, area_id: 2, lleva_decoracion: false },
        { id: 30, area_id: null, lleva_decoracion: false },
        { id: 40, area_id: 1, lleva_decoracion: false },
      ],
      totales: new Map([
        [10, 10],
        [20, 4],
        [30, 3],
        [40, 0],
      ]),
      pasteleras,
      areaDecoracionId: null,
    });

    expect(filas).toEqual(
      expect.arrayContaining([
        { producto_id: 10, pastelera_id: 1, tipo: "produccion", tanda: 1, cantidad: 5 },
        { producto_id: 10, pastelera_id: 2, tipo: "produccion", tanda: 1, cantidad: 5 },
        { producto_id: 20, pastelera_id: 3, tipo: "produccion", tanda: 1, cantidad: 4 },
        { producto_id: 30, pastelera_id: null, tipo: "produccion", tanda: 1, cantidad: 3 },
      ])
    );
    // inactiva no recibe; total 0 no genera filas
    expect(filas.some((f) => f.pastelera_id === 9)).toBe(false);
    expect(filas.some((f) => f.producto_id === 40)).toBe(false);
  });

  it("decoración: usa el área de decoración si tiene pasteleras", () => {
    const filas = generarReparto({
      fecha: "2026-10-15",
      productos: [{ id: 10, area_id: 1, lleva_decoracion: true }],
      totales: new Map([[10, 6]]),
      pasteleras: [
        ...pasteleras,
        { id: 7, area_id: 99, porcentaje: 100, orden: 1, activa: true },
      ],
      areaDecoracionId: 99,
    });
    const deco = filas.filter((f) => f.tipo === "decoracion");
    expect(deco).toEqual([
      { producto_id: 10, pastelera_id: 7, tipo: "decoracion", tanda: 1, cantidad: 6 },
    ]);
  });

  it("decoración sin decoradoras: la hace el área del producto", () => {
    const filas = generarReparto({
      fecha: "2026-10-15",
      productos: [{ id: 10, area_id: 1, lleva_decoracion: true }],
      totales: new Map([[10, 6]]),
      pasteleras,
      areaDecoracionId: 99,
    });
    const deco = filas.filter((f) => f.tipo === "decoracion");
    expect(deco.map((f) => [f.pastelera_id, f.cantidad])).toEqual([
      [1, 3],
      [2, 3],
    ]);
  });
});

describe("generarReparto: sin decorar y áreas en equipo", () => {
  it("lo sin decorar no se hornea de nuevo, pero sí se decora", () => {
    const filas = generarReparto({
      fecha: "2026-10-15",
      productos: [{ id: 10, area_id: 2, lleva_decoracion: true }],
      totales: new Map([[10, 4]]), // 10 a mandar − 6 sin decorar
      totalesDecoracion: new Map([[10, 10]]),
      pasteleras,
      areaDecoracionId: null,
    });
    expect(filas).toEqual([
      { producto_id: 10, pastelera_id: 3, tipo: "produccion", tanda: 1, cantidad: 4 },
      { producto_id: 10, pastelera_id: 3, tipo: "decoracion", tanda: 1, cantidad: 10 },
    ]);
  });

  it("si todo está sin decorar, solo sale la decoración", () => {
    const filas = generarReparto({
      fecha: "2026-10-15",
      productos: [{ id: 10, area_id: 2, lleva_decoracion: true }],
      totales: new Map(),
      totalesDecoracion: new Map([[10, 5]]),
      pasteleras,
      areaDecoracionId: null,
    });
    expect(filas.map((f) => [f.tipo, f.cantidad])).toEqual([["decoracion", 5]]);
  });

  it("área en equipo: no se divide, todo a la titular", () => {
    const filas = generarReparto({
      fecha: "2026-10-15",
      productos: [{ id: 10, area_id: 1, lleva_decoracion: true }],
      totales: new Map([[10, 11]]),
      pasteleras,
      areaDecoracionId: null,
      areasEnEquipo: new Set([1]),
    });
    expect(filas).toEqual([
      { producto_id: 10, pastelera_id: 1, tipo: "produccion", tanda: 1, cantidad: 11 },
      { producto_id: 10, pastelera_id: 1, tipo: "decoracion", tanda: 1, cantidad: 11 },
    ]);
  });

  it("titular: primera activa por orden, aunque tenga 0 %", () => {
    const equipo: PasteleraReparto[] = [
      { id: 5, area_id: 1, porcentaje: 0, orden: 2, activa: true },
      { id: 4, area_id: 1, porcentaje: 0, orden: 1, activa: false },
      { id: 6, area_id: 1, porcentaje: 0, orden: 3, activa: true },
    ];
    expect(titularDeArea(equipo, 1)?.id).toBe(5);
    expect(titularDeArea(equipo, 2)).toBeNull();
  });
});

describe("sumaPorcentajesPorArea y resumirAvance", () => {
  it("no cuenta las áreas en equipo", () => {
    const s = sumaPorcentajesPorArea(pasteleras, new Set([1]));
    expect(s.has(1)).toBe(false);
    expect(s.get(2)).toBe(100);
  });

  it("suma solo activas", () => {
    const s = sumaPorcentajesPorArea(pasteleras);
    expect(s.get(1)).toBe(100);
    expect(s.get(2)).toBe(100);
  });

  it("no cuenta de más lo hecho por encima de la cantidad", () => {
    expect(
      resumirAvance([
        { cantidad: 5, cantidad_hecha: 7, estado: "listo" },
        { cantidad: 4, cantidad_hecha: 1, estado: "en_proceso" },
      ])
    ).toEqual({ hechas: 6, total: 9, listas: 1, tareas: 2 });
  });
});
