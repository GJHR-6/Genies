import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AREAS,
  COBERTURA,
  DECORACION_AGREGAR,
  construirAsignaciones,
  extraerBloques,
  leerCatalogo,
  verificarCobertura,
} from "./distribucion-excel";

const catalogo = leerCatalogo(
  readFileSync(resolve(__dirname, "../supabase/migrations/0003_catalogo_cliente.sql"), "utf8")
);

describe("leerCatalogo", () => {
  it("lee los 133 productos de la migración 0003", () => {
    expect(catalogo).toHaveLength(133);
    expect(catalogo).toContainEqual({
      nombre: "VAINILLA",
      categoria: "VAINILLA",
      tamano: "6X2",
      llevaDecoracion: true,
    });
    expect(catalogo).toContainEqual({
      nombre: "CHOCOFLAN",
      categoria: "ESPECIALES",
      tamano: null,
      llevaDecoracion: false,
    });
  });
});

describe("construirAsignaciones", () => {
  const { asignaciones, sinArea, errores } = construirAsignaciones(catalogo);

  it("no tiene errores (refs existentes, sin asignaciones dobles)", () => {
    expect(errores).toEqual([]);
  });

  it("cubre el catálogo completo: 117 asignados + 16 sin área", () => {
    expect(asignaciones).toHaveLength(117);
    expect(sinArea).toHaveLength(16);
    expect(asignaciones.length + sinArea.length).toBe(catalogo.length);
  });

  it("los sin área son exactamente los que el Excel no menciona", () => {
    expect(sinArea.map((c) => c.nombre).sort()).toEqual(
      [
        "CHOCOALEMAN 6",
        "CHOCOALEMAN 8",
        "COOKIES AND CREAM 6",
        "COOKIES AND CREAM 8",
        "COPENHAGUE GRANDE",
        "COPENHAGUE PEQUEÑO",
        "CROISSANT PAN",
        "DANESAS",
        "FRUTA CRISTALIZADA",
        "MICKEYS",
        "Porciones SELVA NEGRA 6",
        "SELVA NEGRA 6",
        "SELVA NEGRA 8",
        "TARTALETAS FRUTA",
        "TIRAMISU GRD",
        "TIRAMISU PEQ",
      ].sort()
    );
  });

  it("el orden dentro de cada área es único y ascendente", () => {
    for (const area of AREAS) {
      const ordenes = asignaciones.filter((a) => a.area === area.nombre).map((a) => a.orden);
      expect(ordenes.length).toBeGreaterThan(0);
      expect(new Set(ordenes).size).toBe(ordenes.length);
      expect([...ordenes].sort((a, b) => a - b)).toEqual(ordenes);
    }
  });

  it("las porciones quedan junto a su producto base (misma área)", () => {
    const areaDe = new Map(asignaciones.map((a) => [`${a.nombre}|${a.tamano ?? ""}`, a.area]));
    expect(areaDe.get("Porciones MARQUESOTE|")).toBe(areaDe.get("MARQUESOTE|"));
    expect(areaDe.get("Porciones CHEESECAKE GR|")).toBe(areaDe.get("CHEESECAKE GR|"));
    expect(areaDe.get("Porciones VAINILLA|")).toBe(areaDe.get("VAINILLA|9X13X2"));
  });
});

describe("DECORACION_AGREGAR", () => {
  it("todos existen en el catálogo con tamano null y hoy sin marca", () => {
    for (const nombre of DECORACION_AGREGAR) {
      const producto = catalogo.find((c) => c.nombre === nombre && c.tamano === null);
      expect(producto, nombre).toBeDefined();
      expect(producto?.llevaDecoracion, `${nombre} ya estaba marcado`).toBe(false);
    }
  });
});

describe("extraerBloques + verificarCobertura", () => {
  it("separa bloques por columna, descarta pasteleras y encargadas", () => {
    const matriz = [
      ["PASTELERAS 1 Y 2", null, "PASTELERA 3"],
      ["PRODUCCION 1", null, "PRODUCCION 2"],
      ["KENIA Y DANY", null, "MELISSA Y JOHANNA"],
      ["PASTELES DE VAINILLA", null, "INDIVIDUALES  "],
      ["6X2", null, "VAINILLA   4X2"],
      [null, null, null],
      ["DECORACION", null, null],
      ["PASTELES VAINILLA", null, null],
    ];
    const bloques = extraerBloques(matriz);
    expect([...bloques.keys()]).toEqual(["PRODUCCION 1", "DECORACION", "PRODUCCION 2"]);
    expect(bloques.get("PRODUCCION 1")?.map((c) => c.texto)).toEqual([
      "PASTELES DE VAINILLA",
      "6X2",
    ]);
    expect(bloques.get("PRODUCCION 2")?.map((c) => c.texto)).toEqual([
      "INDIVIDUALES",
      "VAINILLA 4X2",
    ]);
    expect(bloques.get("DECORACION")?.map((c) => c.texto)).toEqual(["PASTELES VAINILLA"]);
  });

  it("detecta filas del Excel no contempladas y faltantes", () => {
    const bloques = new Map([
      [
        "PRODUCCION 4",
        [
          { texto: "SANDWICHES", fila: 1 },
          { texto: "POLLO", fila: 2 },
          { texto: "PRODUCTO NUEVO", fila: 3 },
        ],
      ],
    ]);
    const errores = verificarCobertura(bloques);
    expect(errores.some((e) => e.includes('"PRODUCTO NUEVO"'))).toBe(true);
    expect(errores.some((e) => e.includes("PRODUCCION 1"))).toBe(true); // bloque faltante
  });

  it("acepta una cobertura idéntica", () => {
    const bloques = new Map(
      Object.entries(COBERTURA).map(([clave, entradas]) => [
        clave,
        entradas.map((e, i) => ({ texto: e.texto.replace(/\s+/g, " ").trim().toUpperCase(), fila: i + 1 })),
      ])
    );
    expect(verificarCobertura(bloques)).toEqual([]);
  });
});
