/**
 * Demo 6 ago 2026 — Distribución de producción por pastelera.
 *
 * Lee el Excel de la administradora (DISTRIBUCION PRODUCCION Y DECORACION.xlsx,
 * hoja Sheet1, columnas A y C) y genera:
 *   - supabase/migrations/0004_areas_produccion.sql  (tabla areas_produccion +
 *     productos.area_id/orden_area + lleva_decoracion ampliado)
 *   - docs/validacion-distribucion.md                (reporte para la administradora)
 *
 * El matching Excel → catálogo es difuso ("9X12X2" es el 9X13X2 del catálogo,
 * "figuras" son las galletas DECORADAS…), así que el mapeo vive HARDCODEADO y
 * revisado a mano en COBERTURA/EXTRAS. El Excel solo se usa como cross-check:
 * cada celda no vacía de un bloque debe coincidir, en orden, con su entrada de
 * COBERTURA; si el archivo trae algo que el mapeo no contempla, el script aborta.
 *
 * El catálogo se lee de supabase/migrations/0003_catalogo_cliente.sql para
 * garantizar que cada referencia exista con el (nombre, tamano) exacto.
 *
 * Uso:  npx tsx scripts/distribucion-excel.ts "C:\ruta\DISTRIBUCION PRODUCCION Y DECORACION.xlsx"
 */
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// --- Áreas -------------------------------------------------------------------

export interface AreaDef {
  nombre: string;
  encargadas: string;
  orden: number;
  /** Encabezados "PRODUCCION N" del Excel que alimentan esta área. */
  bloques: readonly string[];
}

/**
 * PRODUCCION 4 B (Carolina) y PRODUCCION 5B (Silvia) traen la misma lista de
 * productos; un producto pertenece a una sola área, así que se fusionan en un
 * cuadro compartido (pendiente de validar con la administradora).
 */
export const AREAS: readonly AreaDef[] = [
  { nombre: "Producción 1", encargadas: "Kenia y Dany", orden: 1, bloques: ["PRODUCCION 1"] },
  { nombre: "Producción 2", encargadas: "Melissa y Johanna", orden: 2, bloques: ["PRODUCCION 2"] },
  { nombre: "Producción 3", encargadas: "Heidy", orden: 3, bloques: ["PRODUCCION 3"] },
  { nombre: "Producción 4", encargadas: "Olivia", orden: 4, bloques: ["PRODUCCION 4"] },
  { nombre: "Producción 4B / 5B", encargadas: "Carolina y Silvia", orden: 5, bloques: ["PRODUCCION 4 B", "PRODUCCION 5B"] },
  { nombre: "Producción 5", encargadas: "Audry", orden: 6, bloques: ["PRODUCCION 5"] },
] as const;

// --- Cobertura del Excel -----------------------------------------------------

export interface Ref {
  nombre: string;
  tamano: string | null;
}

/** Referencia a un producto del catálogo por su clave única (nombre, tamano). */
const p = (nombre: string, tamano: string | null = null): Ref => ({ nombre, tamano });

export type Entrada =
  /** Encabezado de sección dentro del bloque (no es un producto). */
  | { texto: string; tipo: "seccion" }
  /** Fila que corresponde a uno o más productos del catálogo (en orden de cuadro). */
  | { texto: string; tipo: "producto"; productos: Ref[]; nota?: string }
  /** Fila sin producto en el catálogo (no se crea; va al reporte). */
  | { texto: string; tipo: "sin"; nota: string }
  /** Fila de PRODUCCION 5B: mismo producto ya asignado vía PRODUCCION 4 B. */
  | { texto: string; tipo: "fusionado" };

const sec = (texto: string): Entrada => ({ texto, tipo: "seccion" });
const prod = (texto: string, productos: Ref[], nota?: string): Entrada => ({
  texto,
  tipo: "producto",
  productos,
  ...(nota === undefined ? {} : { nota }),
});
const sin = (texto: string, nota: string): Entrada => ({ texto, tipo: "sin", nota });
const fus = (texto: string): Entrada => ({ texto, tipo: "fusionado" });

const SIN_TAMANO = "solo existe en el catálogo sin desglose de tamaño";

/** Transcripción anotada del Excel, bloque por bloque, en el orden del archivo. */
export const COBERTURA: Record<string, readonly Entrada[]> = {
  "PRODUCCION 1": [
    sec("PASTELES DE VAINILLA"),
    prod("6X2", [p("VAINILLA", "6X2")]),
    prod("8X2", [p("VAINILLA", "8X2")]),
    prod("9X2", [p("VAINILLA", "9X2")]),
    prod("10X2", [p("VAINILLA", "10X2")]),
    prod("11X2", [p("VAINILLA", "11X2")]),
    prod("9X12X2", [p("VAINILLA", "9X13X2"), p("Porciones VAINILLA")], 'el Excel dice "9X12X2"; el catálogo tiene 9X13X2 (mismo pastel de plancha)'),
    sec("PASTELES DE CHOCOLATE"),
    prod("6X2", [p("CHOCOLATE", "6X2")]),
    prod("8X2", [p("CHOCOLATE", "8X2")]),
    sin("9X2", "pastel de chocolate 9X2 no existe en el catálogo"),
    prod("10X2", [p("CHOCOLATE", "10X2"), p("Porciones CHOCOLATE")]),
    sin("11X2", "pastel de chocolate 11X2 no existe en el catálogo"),
    sin("9X12X2", "pastel de chocolate de plancha no existe en el catálogo"),
    sec("PASTELES MIXTOS"),
    prod("6X2", [p("MIXTO", "6X2")]),
    prod("8X2", [p("MIXTO", "8X2")]),
    prod("10X2", [p("MIXTO", "10X2"), p("Porciones MIXTO")]),
    sec("PASTELES ZANAHORIA"),
    prod("6X2", [p("ZANAHORIA 6"), p("Porciones ZANAHORIA 6")]),
    prod("8X2", [p("ZANAHORIA 8X2")]),
    prod("10X2", [p("ZANAHORIA 10X2")]),
    sec("PASTELES DE MANTEQUILLA"),
    prod("ALMENDRA", [p("ALMENDRA"), p("Porciones ALMENDRA")], SIN_TAMANO),
    sin("6X2", "almendra 6X2: el catálogo tiene ALMENDRA sin tamaños"),
    sin("8X2", "almendra 8X2: el catálogo tiene ALMENDRA sin tamaños"),
    prod("MARMOLEADA", [p("MARMOLEADO"), p("Porciones MARMOLEADO")], SIN_TAMANO),
    sin("6X2", "marmoleada 6X2: el catálogo tiene MARMOLEADO sin tamaños"),
    sin("8X2", "marmoleada 8X2: el catálogo tiene MARMOLEADO sin tamaños"),
    sin("COCO", "pastel de mantequilla de coco no existe en el catálogo (¿es el GLASEADO COCO?)"),
    sin("INDIVIDUAL COCO", "individual de coco no existe en el catálogo"),
    sin("TORTAS DE MANTEQUILLA", "no existe con ese nombre; ¿es la TORTA PC (asignada a Producción 2)?"),
    sec("PASTELES TERCIOPELO"),
    prod("6X2", [p("TERCIOPELO ROJO 6"), p("Porciones TERCIOPELO ROJO 6")]),
    prod("8X2", [p("TERCIOPELO ROJO 8")]),
    prod("CUPCAKES RED VELVET", [p("RED VELVET(6)")]),
    sec("PASTELES VOLTEADOS DE PIÑA"),
    sin("6X2", "volteado de piña 6X2 no existe en el catálogo (solo VOLTEADO 8)"),
    prod("8X2", [p("VOLTEADO 8")]),
    sin("INDIVIDUALES", "volteados individuales no existen en el catálogo"),
    sec("VARIOS"),
    prod("BROWNIE", [p("BROWNIE")]),
    prod("BRAZO GITANO", [p("BRAZO GITANO")]),
    prod("PUDIN QUEQUE", [p("PUDIN DE QUEQUE"), p("Porciones PUDIN DE QUEQUE")]),
    prod("SUSPIROS", [p("SUSPIROS")]),
    prod("BISCOCHOS", [p("BISCOCHOS")]),
    prod("BANANO", [p("BANANO")]),
    sec("PASTELES FRIOS"),
    prod("3 LECHES", [p("3 LECHES 9 PULGADAS"), p("Porciones 3 LECHES 9 PULGADAS")]),
    sec("VAINILLA"),
    sin("6X2", "pastel frío de vainilla 6X2 no existe en el catálogo (solo 3 LECHES 9 PULGADAS)"),
    sin("8X2", "pastel frío de vainilla 8X2 no existe en el catálogo"),
    sec("ECLIPSE"),
    prod("6X2", [p("ECLIPSE 6")]),
    prod("8X2", [p("ECLIPSE 8")]),
    sec("CHOCOLATE"),
    prod("6X2", [p("CHOCOCREMA 6"), p("Porciones CHOCOCREMA 6")], '⚠️ "chocolate frío 6X2" interpretado como CHOCOCREMA 6 — validar'),
    prod("8X2", [p("CHOCOCREMA 8")], '⚠️ "chocolate frío 8X2" interpretado como CHOCOCREMA 8 — validar'),
    sec("CHOCOALMENDRA"),
    prod("6X2", [p("CHOCOALMENDRA 6"), p("Porciones CHOCOALMENDRA 6")]),
    prod("8X2", [p("CHOCOALMENDRA 8")]),
  ],
  DECORACION: [
    sec("PASTELES VAINILLA"),
    prod("6X2", [p("VAINILLA", "6X2")]),
    prod("8X2", [p("VAINILLA", "8X2")]),
    prod("9X2", [p("VAINILLA", "9X2")]),
    prod("10X2", [p("VAINILLA", "10X2")]),
    prod("11X2", [p("VAINILLA", "11X2")]),
    prod("9X12X2", [p("VAINILLA", "9X13X2")]),
    sec("PASTELES DE CHOCOLATE"),
    prod("6X2", [p("CHOCOLATE", "6X2")]),
    prod("8X2", [p("CHOCOLATE", "8X2")]),
    prod("10X2", [p("CHOCOLATE", "10X2")]),
    sec("PASTELES MIXTOS"),
    prod("6X2", [p("MIXTO", "6X2")]),
    prod("8X2", [p("MIXTO", "8X2")]),
    prod("10X2", [p("MIXTO", "10X2")]),
    sec("PASTELES ZANAHORIA"),
    prod("6X2", [p("ZANAHORIA 6")]),
    prod("8X2", [p("ZANAHORIA 8X2")]),
    prod("10X2", [p("ZANAHORIA 10X2")]),
    sec("PASTELES DE MANTEQUILLA"),
    prod("ALMENDRA", [p("ALMENDRA")]),
    sin("6X2", "almendra 6X2: el catálogo tiene ALMENDRA sin tamaños"),
    sin("8X2", "almendra 8X2: el catálogo tiene ALMENDRA sin tamaños"),
    prod("MARMOLEADA", [p("MARMOLEADO")]),
    sin("6X2", "marmoleada 6X2: el catálogo tiene MARMOLEADO sin tamaños"),
    sin("8X2", "marmoleada 8X2: el catálogo tiene MARMOLEADO sin tamaños"),
    sin("COCO", "pastel de mantequilla de coco no existe en el catálogo"),
    sin("INDIVIDUAL COCO", "individual de coco no existe en el catálogo"),
    sec("GLASEADOS"),
    prod("NUEZ", [p("GLASEADO DE NUEZ"), p("GLASEADO DE NUEZ Porciones")], SIN_TAMANO),
    sin("6X2", "glaseado de nuez 6X2: el catálogo lo tiene sin tamaños"),
    sin("8X2", "glaseado de nuez 8X2: el catálogo lo tiene sin tamaños"),
    prod("MINI COCO", [p("GLASEADO COCO")], '⚠️ "mini coco" interpretado como GLASEADO COCO — validar'),
    prod("BANANO", [p("BANANO")]),
    sec("CHOCOLATE DULCE DE LECHE"),
    prod("6X2", [p("DULCE DE LECHE CHOCOLATE 6")]),
    prod("8X2", [p("DULCE LECHE CHOCOLATE 8")]),
    prod("10X2", [p("DULCE DE LECHE CHOCOLATE 10")]),
    sec("QUEQUITOS"),
    prod("VAINILLA", [p("VAINILLA /LUSTRE (6)"), p("VAINILLA SIN LUSTRE")], "cubre quequitos de vainilla con y sin lustre"),
    prod("CHOCOLATE", [p("CHOCOLATE CON LUSTRE (6)")]),
    prod("TWINKIE", [p("TWINKIE")]),
  ],
  "PRODUCCION 2": [
    sec("INDIVIDUALES"),
    prod("VAINILLA 4X2", [p("INDIVIDUALES 4X2")]),
    prod("CHOCOLATE 4X2", [p("INDIVIDUALES CHOCOLATE")]),
    sec("QUEQUITOS"),
    prod("VAINILLA", [p("VAINILLA /LUSTRE (6)"), p("VAINILLA SIN LUSTRE")], "cubre quequitos de vainilla con y sin lustre"),
    prod("CHOCOLATE", [p("CHOCOLATE CON LUSTRE (6)")]),
    prod("QUEQUITO QUESADILLA", [p("QUESADILLA INDIVIDUAL")]),
    sec("TORTAS"),
    prod("MARQUESOTE", [p("MARQUESOTE"), p("Porciones MARQUESOTE")]),
    prod("TORTA DE MARGARINA", [p("MARGARINA"), p("Porciones MARGARINA")]),
    prod("MINI TORTAS MARGARINA", [p("MINI MARGARINA")]),
    sec("MINI CAKE"),
    prod("ALMENDRA", [p("MINICAKE ALMENDRA /PASA")], "el catálogo combina almendra y pasa en un solo producto"),
    sin("PASA", "cubierto por MINICAKE ALMENDRA /PASA (producto combinado en el catálogo)"),
    sec("VARIOS"),
    prod("TWINKIE", [p("TWINKIE")]),
    prod("QUESADILLA ARROZ", [p("QUESADILLA ARROZ PORCION")]),
    prod("ELOTE", [p("ELOTE 9 pulgadas"), p("Porciones ELOTE 9 pulgadas")]),
    prod("GALLETAS MIGA MIGA", [p("MIGA/CHOCO")], "el catálogo combina galleta miga y miga de chocolate en MIGA/CHOCO"),
    sin("GALLETA MIGA CHOCOLATE", "cubierto por MIGA/CHOCO (producto combinado en el catálogo)"),
    sin("GALLETA MIGA ZANAHORIA", "galleta miga de zanahoria no existe en el catálogo"),
  ],
  "PRODUCCION 3": [
    sec("PIES"),
    prod("DURAZNO", [p("DURAZNO"), p("Porciones DURAZNO")]),
    prod("MANZANA", [p("PIE DE MANZANA")]),
    prod("MANZANA DIETA", [p("PIE MANZANA DIETA")]),
    prod("NUEZ", [p("NUEZ"), p("Porciones NUEZ")]),
    prod("PIÑA", [p("PIÑA"), p("Porciones PIÑA")]),
    prod("LECHE", [p("LECHE"), p("Porciones LECHE")]),
    prod("LIMON", [p("LIMON"), p("Porciones LIMON")]),
    sec("CHEESECAKE"),
    prod("PEQUEÑO", [p("CHEESECAKE---- PEQ")]),
    prod("GRANDE", [p("CHEESECAKE GR"), p("Porciones CHEESECAKE GR")]),
    sec("MINIS"),
    prod("FRESA", [p("QUEQUITOS CHEESECAKE FRESA")]),
    prod("OREO", [p("QUEQUITOS CHEESECAKE OREO")]),
    prod("DULCE DE LECHE", [p("QUEQUITO CHEESECAKE DULCE LECHE")]),
    sin("MARACUYA", "cheesecake mini de maracuyá no existe en el catálogo"),
    sec("FLAN"),
    prod("VAINILLA", [p("FLAN VAINILLA MEDIANO"), p("FLAN VAINILLA COPA")], "cubre mediano y copa"),
    prod("COCO", [p("FLAN COCO MEDIANO"), p("FLAN COCO COPA")], "cubre mediano y copa"),
    prod("CHOCOFLAN", [p("CHOCOFLAN"), p("CHOCOFLAN PORCIONES")]),
    sec("VARIOS"),
    prod("ESPUMILLAS", [p("ESPUMILLAS"), p("ESPUMILLA PALETA")], "cubre espumillas y espumilla de paleta"),
    prod("ALBOROTOS", [p("ALBOROTOS (RICE KRISPIES)")]),
    prod("PROFITEROLES", [p("PROFITEROLES")]),
    prod("RELAMPAGOS", [p("RELAMPAGOS")]),
  ],
  "PRODUCCION 4": [
    sec("SANDWICHES"),
    prod("POLLO", [p("SANDWICH POLLO")]),
    prod("DIETA", [p("SANDWICH POLLO DIETA")]),
    prod("JAMON Y QUESO", [p("SANDWICH JAMON Y QUESO")]),
    prod("CROISSANWICH GRANDE", [p("CROISSANDWICH")], "el catálogo combina grande y pequeño en CROISSANDWICH"),
    sin("CROISSANWICH PEQUEÑO", "cubierto por CROISSANDWICH (producto combinado en el catálogo)"),
    prod("PIE DE POLLO", [p("PIE DE POLLO")]),
  ],
  "PRODUCCION 4 B": [
    prod("PASTELITOS CARNE", [p("PASTELITOS CARNE")]),
    prod("PASTELITOS POLLO", [p("PASTELITOS POLLO")]),
    prod("PASTELITOS PIÑA", [p("PASTELITOS PIÑA")]),
    prod("GALLETAS ARROZ", [p("ARROZ")]),
    prod("GALLETAS CREMA", [p("CREMA")]),
    prod("GALLETA AJONJOLI", [p("GALLETAS AJONJOJI")]),
    prod("GALLETA COCO", [p("GALLETAS COCO")]),
  ],
  "PRODUCCION 5": [
    sec("GALLETAS"),
    prod("MANTEQUILLA/PASA", [p("MANTEQUILLA/PASA")]),
    prod("CORTAR", [p("CORTAR")]),
    prod("FIGURAS", [p("DECORADAS")], '⚠️ "figuras" interpretado como galletas DECORADAS — validar'),
    sec("LEVADURAS"),
    prod("TRENZAS", [p("TRENZAS")]),
    prod("ENCANELADOS", [p("ENCANELADO 1")]),
    sin("BOLLITOS QUESO", "bollitos de queso no existen en el catálogo"),
  ],
  "PRODUCCION 5B": [
    fus("PASTELITOS CARNE"),
    fus("PASTELITOS POLLO"),
    fus("PASTELITOS PIÑA"),
    fus("GALLETAS ARROZ"),
    fus("GALLETAS CREMA"),
    fus("GALLETA AJONJOLI"),
    fus("GALLETA COCO"),
  ],
};

/**
 * Productos del catálogo que no aparecen en su bloque de producción del Excel
 * pero se asignan a un área (con nota para validar). Van al final del cuadro.
 */
export const EXTRAS: Record<string, ReadonlyArray<Ref & { nota: string }>> = {
  "Producción 1": [
    { ...p("DULCE DE LECHE CHOCOLATE 6"), nota: "solo aparece en la sección DECORACIÓN; se asigna a Producción 1 (misma columna del Excel) — validar" },
    { ...p("DULCE LECHE CHOCOLATE 8"), nota: "solo aparece en la sección DECORACIÓN; se asigna a Producción 1 — validar" },
    { ...p("DULCE DE LECHE CHOCOLATE 10"), nota: "solo aparece en la sección DECORACIÓN; se asigna a Producción 1 — validar" },
    { ...p("GLASEADO DE NUEZ"), nota: "solo aparece en la sección DECORACIÓN (glaseados); se asigna a Producción 1 — validar" },
    { ...p("GLASEADO DE NUEZ Porciones"), nota: "porción del glaseado de nuez; sigue a su producto base" },
    { ...p("GLASEADO COCO"), nota: 'solo aparece en la sección DECORACIÓN ("mini coco"); se asigna a Producción 1 — validar' },
    { ...p("Porciones de pastel de 8"), nota: "base ambigua en el catálogo; se asigna a Producción 1 (pasteles) — validar" },
  ],
  "Producción 2": [
    { ...p("TORTA PC"), nota: 'no aparece en el Excel nuevo; se asigna con el resto de TORTAS — validar (¿es la "tortas de mantequilla" de Producción 1?)' },
    { ...p("Porciones TORTA PC"), nota: "porción de la TORTA PC; sigue a su producto base" },
  ],
};

/**
 * Productos que la sección DECORACIÓN del Excel agrega a los ya marcados con
 * lleva_decoracion en 0003. Solo se agrega; no se quita ninguno (TERCIOPELO y
 * VOLTEADO siguen marcados aunque el Excel ya no los liste — pregunta abierta).
 * Todos tienen tamano null en el catálogo.
 */
export const DECORACION_AGREGAR: readonly string[] = [
  "VAINILLA /LUSTRE (6)",
  "VAINILLA SIN LUSTRE",
  "CHOCOLATE CON LUSTRE (6)",
  "TWINKIE",
  "GLASEADO DE NUEZ",
  "GLASEADO DE NUEZ Porciones",
  "GLASEADO COCO",
  "BANANO",
  "DULCE LECHE CHOCOLATE 8",
];

// --- Utilidades --------------------------------------------------------------

const colapsar = (s: string): string => s.replace(/\s+/g, " ").trim();
const normalizar = (s: string): string => colapsar(s).toUpperCase();
const claveRef = (r: Ref): string => `${r.nombre}|${r.tamano ?? ""}`;
const sqlTexto = (s: string): string => `'${s.replace(/'/g, "''")}'`;
const sqlTextoONulo = (s: string | null): string => (s === null ? "null" : sqlTexto(s));

// --- Catálogo desde 0003 -----------------------------------------------------

export interface ProductoCatalogo extends Ref {
  categoria: string | null;
  llevaDecoracion: boolean;
}

/** Extrae los 133 productos del insert de la migración 0003. */
export function leerCatalogo(sql: string): ProductoCatalogo[] {
  const inicio = sql.indexOf("insert into productos");
  const fin = sql.indexOf(";", inicio);
  if (inicio === -1 || fin === -1) throw new Error("No se encontró el insert de productos en 0003");
  const bloque = sql.slice(inicio, fin);
  const patron =
    /\('((?:[^']|'')*)',\s*(?:'((?:[^']|'')*)'|null),\s*(?:'((?:[^']|'')*)'|null),\s*\(select id from departamentos where nombre = '(?:[^']|'')*'\),\s*(true|false)\)/g;
  const productos: ProductoCatalogo[] = [];
  for (const m of bloque.matchAll(patron)) {
    const desescapar = (s: string | undefined): string | null =>
      s === undefined ? null : s.replace(/''/g, "'");
    productos.push({
      nombre: desescapar(m[1]) as string,
      categoria: desescapar(m[2]),
      tamano: desescapar(m[3]),
      llevaDecoracion: m[4] === "true",
    });
  }
  return productos;
}

// --- Asignaciones ------------------------------------------------------------

export interface Asignacion extends Ref {
  area: string;
  orden: number;
  nota?: string;
}

/**
 * Construye la lista producto → (área, orden) a partir de COBERTURA + EXTRAS y
 * valida: refs existentes en el catálogo, sin asignaciones dobles.
 * Devuelve también los productos del catálogo que quedaron sin área.
 */
export function construirAsignaciones(catalogo: ProductoCatalogo[]): {
  asignaciones: Asignacion[];
  sinArea: ProductoCatalogo[];
  errores: string[];
} {
  const porClave = new Map(catalogo.map((c) => [claveRef(c), c]));
  const errores: string[] = [];
  const asignaciones: Asignacion[] = [];
  const yaAsignado = new Map<string, string>();

  const asignar = (ref: Ref, area: string, orden: number, nota?: string): void => {
    const clave = claveRef(ref);
    if (!porClave.has(clave)) {
      errores.push(`${area}: "${ref.nombre}"${ref.tamano ? ` ${ref.tamano}` : ""} no existe en el catálogo 0003`);
      return;
    }
    const previa = yaAsignado.get(clave);
    if (previa !== undefined) {
      errores.push(`"${ref.nombre}" asignado dos veces (${previa} y ${area})`);
      return;
    }
    yaAsignado.set(clave, area);
    asignaciones.push({ ...ref, area, orden, ...(nota === undefined ? {} : { nota }) });
  };

  for (const area of AREAS) {
    let orden = 10;
    // Solo el primer bloque asigna; los demás (fusión 5B) son duplicados.
    for (const entrada of COBERTURA[area.bloques[0]] ?? []) {
      if (entrada.tipo !== "producto") continue;
      for (const ref of entrada.productos) {
        asignar(ref, area.nombre, orden, entrada.nota);
        orden += 10;
      }
    }
    for (const extra of EXTRAS[area.nombre] ?? []) {
      asignar(extra, area.nombre, orden, extra.nota);
      orden += 10;
    }
  }

  // Refs de DECORACION y DECORACION_AGREGAR también deben existir.
  for (const entrada of COBERTURA.DECORACION) {
    if (entrada.tipo !== "producto") continue;
    for (const ref of entrada.productos) {
      if (!porClave.has(claveRef(ref))) {
        errores.push(`DECORACION: "${ref.nombre}"${ref.tamano ? ` ${ref.tamano}` : ""} no existe en el catálogo 0003`);
      }
    }
  }
  for (const nombre of DECORACION_AGREGAR) {
    if (!porClave.has(`${nombre}|`)) {
      errores.push(`DECORACION_AGREGAR: "${nombre}" no existe en el catálogo 0003 (con tamano null)`);
    }
  }

  const sinArea = catalogo.filter((c) => !yaAsignado.has(claveRef(c)));
  return { asignaciones, sinArea, errores };
}

// --- Cross-check contra el Excel ---------------------------------------------

export interface Celda {
  texto: string;
  fila: number; // 1-based, como en Excel
}

/**
 * Recorre las columnas A y C de la hoja y devuelve, por bloque ("PRODUCCION 1",
 * "DECORACION", …), la secuencia de celdas no vacías. Los encabezados
 * "PASTELERA(S) …" y la línea de encargadas tras "PRODUCCION N" se descartan.
 */
export function extraerBloques(matriz: ReadonlyArray<ReadonlyArray<string | number | null>>): Map<string, Celda[]> {
  const bloques = new Map<string, Celda[]>();
  for (const col of [0, 2]) {
    let bloque: string | null = null;
    let esperaEncargadas = false;
    for (let i = 0; i < matriz.length; i++) {
      const crudo = matriz[i]?.[col];
      if (crudo === null || crudo === undefined || String(crudo).trim() === "") continue;
      const texto = colapsar(String(crudo));
      const norma = normalizar(texto);
      if (norma.startsWith("PASTELERA")) continue;
      if (/^PRODUCCION\s*\d/.test(norma)) {
        bloque = norma;
        esperaEncargadas = true;
        if (!bloques.has(bloque)) bloques.set(bloque, []);
        continue;
      }
      if (norma === "DECORACION") {
        bloque = norma;
        esperaEncargadas = false;
        if (!bloques.has(bloque)) bloques.set(bloque, []);
        continue;
      }
      if (esperaEncargadas) {
        esperaEncargadas = false; // línea de encargadas (nombres)
        continue;
      }
      if (bloque !== null) bloques.get(bloque)?.push({ texto: norma, fila: i + 1 });
    }
  }
  return bloques;
}

/** Compara los bloques del Excel contra COBERTURA; cualquier diferencia es error. */
export function verificarCobertura(bloques: Map<string, Celda[]>): string[] {
  const errores: string[] = [];
  const claves = new Set([...Object.keys(COBERTURA), ...bloques.keys()]);
  for (const clave of claves) {
    const esperado = COBERTURA[clave];
    const real = bloques.get(clave);
    if (!esperado) {
      errores.push(`El Excel trae el bloque "${clave}" que COBERTURA no contempla`);
      continue;
    }
    if (!real) {
      errores.push(`COBERTURA espera el bloque "${clave}" pero el Excel no lo trae`);
      continue;
    }
    const n = Math.max(esperado.length, real.length);
    for (let i = 0; i < n; i++) {
      const e = esperado[i];
      const r = real[i];
      if (e === undefined) {
        errores.push(`${clave}: fila ${r.fila} "${r.texto}" no está contemplada en COBERTURA`);
      } else if (r === undefined) {
        errores.push(`${clave}: COBERTURA espera "${e.texto}" pero el Excel ya no trae más filas`);
      } else if (normalizar(e.texto) !== r.texto) {
        errores.push(`${clave}: fila ${r.fila} dice "${r.texto}" pero COBERTURA espera "${e.texto}"`);
      }
    }
  }
  return errores;
}

// --- Generación de SQL y reporte ---------------------------------------------

function generarSql(asignaciones: Asignacion[], fecha: string): string {
  const lineas: string[] = [];
  lineas.push("-- =====================================================================");
  lineas.push("-- Áreas de producción (pasteleras) — generado por scripts/distribucion-excel.ts");
  lineas.push(`-- Fuente: DISTRIBUCION PRODUCCION Y DECORACION.xlsx · Generado: ${fecha}`);
  lineas.push("-- Un cuadro de producción por área; ver docs/validacion-distribucion.md.");
  lineas.push("-- =====================================================================");
  lineas.push("");
  lineas.push("begin;");
  lineas.push("");
  lineas.push("create table areas_produccion (");
  lineas.push("  id         smallint generated always as identity primary key,");
  lineas.push("  nombre     text     not null unique,");
  lineas.push("  encargadas text     not null,");
  lineas.push("  orden      smallint not null unique,");
  lineas.push("  activa     boolean  not null default true");
  lineas.push(");");
  lineas.push("");
  lineas.push("alter table areas_produccion enable row level security;");
  lineas.push("");
  lineas.push("-- Mismas políticas que el resto del catálogo (0001): todos leen, admin escribe.");
  lineas.push("create policy area_lectura on areas_produccion");
  lineas.push("  for select to authenticated using (true);");
  lineas.push("create policy area_admin on areas_produccion");
  lineas.push("  for all to authenticated using (es_admin()) with check (es_admin());");
  lineas.push("");
  lineas.push("insert into areas_produccion (nombre, encargadas, orden) values");
  lineas.push(
    AREAS.map((a) => `  (${sqlTexto(a.nombre)}, ${sqlTexto(a.encargadas)}, ${a.orden})`).join(",\n") + ";"
  );
  lineas.push("");
  lineas.push("-- área y orden dentro del cuadro; null = sin área asignada (cuadro final)");
  lineas.push("alter table productos");
  lineas.push("  add column area_id    smallint references areas_produccion(id),");
  lineas.push("  add column orden_area smallint;");
  lineas.push("");
  lineas.push("update productos p");
  lineas.push("set area_id = a.id, orden_area = v.orden");
  lineas.push("from (values");
  lineas.push(
    asignaciones
      .map(
        (x, i) =>
          `  (${sqlTexto(x.nombre)}, ${sqlTextoONulo(x.tamano)}, ${sqlTexto(x.area)}, ${x.orden}${i === 0 ? "::smallint" : ""})`
      )
      .join(",\n")
  );
  lineas.push(") as v(nombre, tamano, area, orden)");
  lineas.push("join areas_produccion a on a.nombre = v.area");
  lineas.push("where p.nombre = v.nombre and p.tamano is not distinct from v.tamano;");
  lineas.push("");
  lineas.push("-- Decoración según la sección DECORACIÓN del Excel (solo se agrega, no se quita)");
  lineas.push("update productos set lleva_decoracion = true");
  lineas.push("where tamano is null and nombre in (");
  lineas.push(DECORACION_AGREGAR.map((n) => `  ${sqlTexto(n)}`).join(",\n"));
  lineas.push(");");
  lineas.push("");
  lineas.push("-- Verificación: todas las asignaciones deben haber casado con un producto.");
  lineas.push("do $$");
  lineas.push("declare n integer;");
  lineas.push("begin");
  lineas.push("  select count(*) into n from productos where area_id is not null;");
  lineas.push(`  if n <> ${asignaciones.length} then`);
  lineas.push(`    raise exception 'productos con área: % (esperados ${asignaciones.length})', n;`);
  lineas.push("  end if;");
  lineas.push("end $$;");
  lineas.push("");
  lineas.push("commit;");
  lineas.push("");
  return lineas.join("\n");
}

function generarReporte(
  asignaciones: Asignacion[],
  sinArea: ProductoCatalogo[],
  fecha: string
): string {
  const md: string[] = [];
  md.push("# Distribución por pastelera — reporte para validar con la administradora");
  md.push("");
  md.push(`Generado por \`scripts/distribucion-excel.ts\` el ${fecha}, a partir de`);
  md.push("`DISTRIBUCION PRODUCCION Y DECORACION.xlsx`. Los cuadros de producción ahora");
  md.push("salen **por área de producción (pastelera)** en lugar de por departamento.");
  md.push("");
  md.push("## Resumen");
  md.push("");
  md.push("| Qué | Cantidad |");
  md.push("|---|---|");
  md.push(`| Áreas de producción | ${AREAS.length} |`);
  md.push(`| Productos asignados a un área | ${asignaciones.length} |`);
  md.push(`| Productos sin área (cuadro "Sin área asignada") | ${sinArea.length} |`);
  md.push("");
  md.push("## Decisiones que necesitan visto bueno");
  md.push("");
  md.push("1. **Producción 4B y 5B se fusionaron** en un solo cuadro \"Producción 4B / 5B —");
  md.push("   Carolina y Silvia\": el Excel les da la misma lista de productos y el sistema");
  md.push("   asigna cada producto a una sola área. ¿Está bien un cuadro compartido o hay");
  md.push("   que repartir cantidades entre ellas?");
  md.push("2. **Porciones**: cada \"Porciones X\" quedó en el área de su producto base");
  md.push("   (alguien las hornea). ¿Correcto, o las porciones no van en el cuadro?");
  md.push("3. **Decoración** no es un área: su cuadro repite los productos marcados con");
  md.push("   \"Decorar\". El Excel ya no lista terciopelo ni volteado en DECORACIÓN, pero");
  md.push("   se dejaron marcados por si fue omisión. ¿Se les quita la marca?");
  md.push("4. La sección DECORACIÓN agrega la marca \"Decorar\" a: " + DECORACION_AGREGAR.join(", ") + ".");
  md.push("   Estos productos también entran al desglose de decoración en la captura de Principal.");
  md.push("");
  md.push("## Interpretaciones ambiguas (⚠️ confirmar)");
  md.push("");
  const ambiguos = asignaciones.filter((x) => x.nota !== undefined);
  md.push("| Producto | Área | Nota |");
  md.push("|---|---|---|");
  for (const x of ambiguos) {
    md.push(`| ${x.nombre}${x.tamano ? ` ${x.tamano}` : ""} | ${x.area} | ${x.nota} |`);
  }
  md.push("");
  md.push("## Filas del Excel sin producto en el catálogo (no se crearon)");
  md.push("");
  md.push("Si alguno de estos sí se produce, hay que darlo de alta en el catálogo con su");
  md.push("regla de sugeridos antes de que aparezca en los cuadros.");
  md.push("");
  md.push("| Bloque | Fila del Excel | Nota |");
  md.push("|---|---|---|");
  for (const [bloque, entradas] of Object.entries(COBERTURA)) {
    for (const e of entradas) {
      if (e.tipo === "sin" && !e.nota.startsWith("cubierto por")) {
        md.push(`| ${bloque} | ${e.texto} | ${e.nota} |`);
      }
    }
  }
  md.push("");
  md.push("## Productos del catálogo que el Excel no menciona (cuadro \"Sin área asignada\")");
  md.push("");
  md.push("Aparecen al final de /cuadros para no perder su producción. Candidatos a área:");
  md.push("fríos (tiramisú, cookies and cream, chocoalemán, selva negra) → ¿Producción 1?;");
  md.push("MICKEYS y CROISSANT PAN → ¿Producción 4?; FRUTA CRISTALIZADA → ¿Producción 5");
  md.push("(levaduras)?; DANESAS, TARTALETAS, COPENHAGUE → indicar.");
  md.push("");
  for (const c of sinArea) {
    md.push(`- ${c.nombre}${c.tamano ? ` ${c.tamano}` : ""}${c.categoria ? ` (${c.categoria})` : ""}`);
  }
  md.push("");
  md.push("## Distribución completa");
  md.push("");
  for (const area of AREAS) {
    md.push(`### ${area.nombre} — ${area.encargadas}`);
    md.push("");
    for (const x of asignaciones.filter((a) => a.area === area.nombre)) {
      md.push(`- ${x.nombre}${x.tamano ? ` ${x.tamano}` : ""}`);
    }
    md.push("");
  }
  return md.join("\n");
}

// --- Programa principal ------------------------------------------------------

function main(): void {
  const rutaExcel = process.argv[2];
  if (!rutaExcel) {
    console.error('Uso: npx tsx scripts/distribucion-excel.ts "/ruta/al/Excel.xlsx"');
    process.exit(1);
  }

  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");

  // 1. Catálogo real desde 0003.
  const sql0003 = readFileSync(resolve(raiz, "supabase/migrations/0003_catalogo_cliente.sql"), "utf8");
  const catalogo = leerCatalogo(sql0003);
  if (catalogo.length !== 133) {
    console.error(`✖ Se esperaban 133 productos en 0003 y se leyeron ${catalogo.length}`);
    process.exit(1);
  }

  // 2. Cross-check del Excel contra COBERTURA.
  const libro = XLSX.readFile(resolve(rutaExcel));
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) throw new Error("El Excel no tiene hojas");
  const matriz = XLSX.utils.sheet_to_json<Array<string | number | null>>(hoja, {
    header: 1,
    defval: null,
    raw: true,
  });
  const erroresExcel = verificarCobertura(extraerBloques(matriz));
  if (erroresExcel.length > 0) {
    console.error("✖ El Excel no coincide con COBERTURA:");
    for (const e of erroresExcel) console.error(`  - ${e}`);
    process.exit(1);
  }

  // 3. Asignaciones y validación contra el catálogo.
  const { asignaciones, sinArea, errores } = construirAsignaciones(catalogo);
  if (errores.length > 0) {
    console.error("✖ El mapeo no es válido:");
    for (const e of errores) console.error(`  - ${e}`);
    process.exit(1);
  }

  // 4. Salidas.
  const fecha = new Date().toISOString().slice(0, 10);
  const rutaSql = resolve(raiz, "supabase/migrations/0004_areas_produccion.sql");
  writeFileSync(rutaSql, generarSql(asignaciones, fecha), "utf8");
  const rutaMd = resolve(raiz, "docs/validacion-distribucion.md");
  writeFileSync(rutaMd, generarReporte(asignaciones, sinArea, fecha), "utf8");

  console.log(`✔ ${AREAS.length} áreas, ${asignaciones.length} productos asignados, ${sinArea.length} sin área`);
  console.log(`✔ SQL:     ${rutaSql}`);
  console.log(`✔ Reporte: ${rutaMd}`);
}

// Solo correr como CLI; los tests importan las funciones puras sin efectos.
const esEjecucionDirecta =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esEjecucionDirecta) main();
