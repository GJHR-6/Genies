/**
 * M2 — Migración del Excel del cliente (PRINCIPAL Auto inventario diario.xlsx)
 *
 * Extrae catálogo de productos, departamentos y reglas de sugeridos y genera:
 *   - supabase/migrations/0003_catalogo_cliente.sql  (inserts idempotentes sobre datos de prueba)
 *   - docs/M2-validacion.md                          (reporte para validar con la administradora)
 *
 * Uso:  npx tsx scripts/migrar-excel.ts "/ruta/al/PRINCIPAL Auto inventario diario.xlsx"
 *
 * Interpretación de las reglas de sugeridos (hoja "SUGERIDOS  PARA CAMBIAR").
 * dia_semana: 0=domingo … 6=sábado (convención del esquema):
 *   - número N o "N DIARIOS"  → objetivo N todos los días (dia_semana null)
 *   - "A M-J / B V-L"         → mar–jue = A; vie, sáb, dom y lun = B
 *   - "A S/D B"               → lun–vie = A; sáb y dom = B
 *   - "AV/BS"                 → viernes = A; sábado = B; resto sin regla
 *   - "A Y B" / "A / B"       → producto combinado: objetivo A+B (queda advertencia)
 *   - 0, vacío o ilegible     → sin regla (los ilegibles quedan en el reporte)
 */
import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// --- Configuración -----------------------------------------------------------

const HOJA_INVENTARIO = "INVENTARIO DIARIO";
const HOJA_SUGERIDOS = "SUGERIDOS  PARA CAMBIAR";

/** Secciones del Excel en orden; cada una se vuelve un departamento. */
const SECCIONES = [
  "VAINILLA",
  "CHOCOLATE",
  "MIXTO",
  "PASTELES VARIOS",
  "QUEQUITOS",
  "TORTAS",
  "REPOSTERIA",
  "REPOSTERIA DE PAN",
  "PIES",
  "VARIOS",
  "PANES",
  "GALLETAS",
  "SALADO",
  "FRIO VAINILLA",
  "FRIO CHOCOLATE",
  "REPOSTERIA FRIA",
  "ESPECIALES",
] as const;

/** Secciones de pasteles cuyo inventario en Principal se desglosa decorado / sin decorar. */
const SECCIONES_DECORACION = new Set(["VAINILLA", "CHOCOLATE", "MIXTO", "PASTELES VARIOS"]);

/** Columnas de la hoja de sugeridos (índice 0 = PRODUCTO) → sucursal en la BD. */
const COLUMNAS_SUCURSAL: ReadonlyArray<{ col: number; sucursal: string }> = [
  { col: 1, sucursal: "Cypress" },
  { col: 2, sucursal: "Chalets" },
  { col: 3, sucursal: "Century" },
  { col: 4, sucursal: "Altara" },
  { col: 5, sucursal: "Principal" },
  { col: 6, sucursal: "Palenque" },
];

// Días: 0=domingo 1=lunes 2=martes 3=miércoles 4=jueves 5=viernes 6=sábado
const MAR_A_JUE = [2, 3, 4];
const VIE_A_LUN = [5, 6, 0, 1];
const LUN_A_VIE = [1, 2, 3, 4, 5];
const FIN_DE_SEMANA = [6, 0];

// --- Tipos -------------------------------------------------------------------

type Celda = string | number | null;

interface Producto {
  clave: string; // sección + nombre normalizado + ocurrencia (para casar ambas hojas)
  nombre: string;
  tamano: string | null;
  categoria: string;
  llevaDecoracion: boolean;
}

interface Regla {
  producto: Producto;
  sucursal: string;
  diaSemana: number | null;
  objetivo: number;
}

interface Advertencia {
  hoja: string;
  fila: number; // 1-based como en Excel
  detalle: string;
}

// --- Utilidades --------------------------------------------------------------

const colapsar = (s: string): string => s.replace(/\s+/g, " ").trim();
const normalizar = (s: string): string => colapsar(s).toUpperCase();

const esTamano = (s: string): boolean =>
  /^\d+\s*X\s*\d+(\s*X\s*\d+)?(\s*PULGADAS)?$/i.test(normalizar(s));

const limpiarTamano = (s: string): string =>
  normalizar(s).replace(/\s*PULGADAS$/, "").replace(/\s*/g, "");

const sqlTexto = (s: string): string => `'${s.replace(/'/g, "''")}'`;
const sqlTextoONulo = (s: string | null): string => (s === null ? "null" : sqlTexto(s));

// --- Parseo de filas de producto (misma lógica para ambas hojas) -------------

interface FilaParseada {
  seccion: string;
  nombre: string;
  tamano: string | null;
  clave: string;
}

/**
 * Recorre la columna A y produce la lista de productos con su sección.
 * Las filas de sección son encabezados (sus valores son sumas), no productos.
 */
function parsearFilas(celdasA: Celda[], hoja: string, advertencias: Advertencia[]): FilaParseada[] {
  const filas: FilaParseada[] = [];
  const ocurrencias = new Map<string, number>();
  let seccion: string | null = null;
  let ultimoNombre: string | null = null;

  for (let i = 1; i < celdasA.length; i++) {
    const crudo = celdasA[i];
    if (crudo === null || String(crudo).trim() === "") continue;
    const texto = colapsar(String(crudo));
    const norma = normalizar(texto);

    if ((SECCIONES as readonly string[]).includes(norma)) {
      seccion = norma;
      ultimoNombre = null;
      continue;
    }
    if (seccion === null) {
      advertencias.push({ hoja, fila: i + 1, detalle: `"${texto}" aparece antes de la primera sección; se omitió` });
      continue;
    }

    let nombre: string;
    let tamano: string | null;
    if (esTamano(texto)) {
      nombre = seccion;
      tamano = limpiarTamano(texto);
    } else if (norma === "PORCIONES") {
      // La porción pertenece al producto inmediato anterior (o a la sección si venía de tamaños).
      nombre = `Porciones ${ultimoNombre ?? seccion}`;
      tamano = null;
    } else {
      nombre = texto;
      tamano = null;
    }

    const base = `${seccion}|${normalizar(nombre)}|${tamano ?? ""}`;
    const n = (ocurrencias.get(base) ?? 0) + 1;
    ocurrencias.set(base, n);
    if (n > 1) {
      advertencias.push({ hoja, fila: i + 1, detalle: `Producto repetido "${nombre}${tamano ? ` ${tamano}` : ""}" (ocurrencia ${n})` });
    }
    filas.push({ seccion, nombre, tamano, clave: `${base}|${n}` });
    if (norma !== "PORCIONES") ultimoNombre = nombre;
  }
  return filas;
}

// --- Parseo de una celda de sugerido -----------------------------------------

interface ReglaParseada {
  porDia: ReadonlyArray<{ dia: number | null; objetivo: number }>;
  advertencia?: string;
}

export function parsearSugerido(celda: Celda): ReglaParseada {
  if (celda === null) return { porDia: [] };
  if (typeof celda === "number") {
    return { porDia: celda > 0 ? [{ dia: null, objetivo: Math.round(celda) }] : [] };
  }
  const texto = normalizar(celda);
  if (texto === "" || texto === "0") return { porDia: [] };

  let m = texto.match(/^(\d+)\s*DIARIOS?$/);
  if (m) return { porDia: [{ dia: null, objetivo: Number(m[1]) }] };

  // "4 M-J / 2 V-L", "4 M-J/V-L3", "6M-J/V-L8", "2S/D 3" no entra aquí
  const mj = texto.match(/(\d+)\s*M-J/);
  const vl = texto.match(/V-L\s*(\d+)|(\d+)\s*V-L/);
  if (mj && vl) {
    const a = Number(mj[1]);
    const b = Number(vl[1] ?? vl[2]);
    return {
      porDia: [
        ...MAR_A_JUE.map((dia) => ({ dia, objetivo: a })),
        ...VIE_A_LUN.map((dia) => ({ dia, objetivo: b })),
      ],
    };
  }

  m = texto.match(/^(\d+)\s*S\s*\/\s*D\s*(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return {
      porDia: [
        ...LUN_A_VIE.map((dia) => ({ dia, objetivo: a })),
        ...FIN_DE_SEMANA.map((dia) => ({ dia, objetivo: b })),
      ],
    };
  }

  m = texto.match(/^(\d+)\s*V\s*\/\s*(\d+)\s*S$/);
  if (m) {
    return {
      porDia: [
        { dia: 5, objetivo: Number(m[1]) },
        { dia: 6, objetivo: Number(m[2]) },
      ],
    };
  }

  m = texto.match(/^(\d+)\s*(?:Y|\/)\s*(\d+)$/);
  if (m) {
    const total = Number(m[1]) + Number(m[2]);
    return {
      porDia: total > 0 ? [{ dia: null, objetivo: total }] : [],
      advertencia: `Producto combinado ("${colapsar(celda)}"): se sumó como objetivo ${total}; confirmar si deben ser dos productos`,
    };
  }

  return { porDia: [], advertencia: `Valor ilegible "${colapsar(celda)}": quedó sin regla` };
}

// --- Programa principal --------------------------------------------------------

function main(): void {
  const rutaExcel = process.argv[2];
  if (!rutaExcel) {
    console.error('Uso: npx tsx scripts/migrar-excel.ts "/ruta/al/Excel.xlsx"');
    process.exit(1);
  }

  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const libro = XLSX.readFile(resolve(rutaExcel));
  const advertencias: Advertencia[] = [];

  const columnaA = (hoja: string): Celda[] => {
    const ws = libro.Sheets[hoja];
    if (!ws) throw new Error(`No existe la hoja "${hoja}" en el Excel`);
    const matriz = XLSX.utils.sheet_to_json<Celda[]>(ws, { header: 1, defval: null, raw: true });
    return matriz.map((f) => f[0] ?? null);
  };

  // 1. Catálogo: la hoja INVENTARIO DIARIO es la fuente canónica de productos.
  const filasInventario = parsearFilas(columnaA(HOJA_INVENTARIO), HOJA_INVENTARIO, advertencias);
  const productos: Producto[] = filasInventario.map((f) => ({
    clave: f.clave,
    nombre: f.nombre,
    tamano: f.tamano,
    categoria: f.seccion,
    llevaDecoracion:
      SECCIONES_DECORACION.has(f.seccion) && !normalizar(f.nombre).startsWith("PORCIONES"),
  }));
  const porClave = new Map(productos.map((p) => [p.clave, p]));

  // 2. Reglas de sugeridos.
  const wsSugeridos = libro.Sheets[HOJA_SUGERIDOS];
  if (!wsSugeridos) throw new Error(`No existe la hoja "${HOJA_SUGERIDOS}" en el Excel`);
  const matrizSugeridos = XLSX.utils.sheet_to_json<Celda[]>(wsSugeridos, {
    header: 1,
    defval: null,
    raw: true,
  });
  const filasSugeridos = parsearFilas(
    matrizSugeridos.map((f) => f[0] ?? null),
    HOJA_SUGERIDOS,
    advertencias
  );

  // Índice fila de Excel → clave de producto para leer las columnas por sucursal.
  const reglas: Regla[] = [];
  const productosConRegla = new Set<string>();
  {
    // Reconstruye el número de fila real de cada producto de la hoja de sugeridos.
    const celdasA = matrizSugeridos.map((f) => f[0] ?? null);
    let idx = 0;
    for (let i = 1; i < celdasA.length && idx < filasSugeridos.length; i++) {
      const crudo = celdasA[i];
      if (crudo === null || String(crudo).trim() === "") continue;
      const norma = normalizar(String(crudo));
      if ((SECCIONES as readonly string[]).includes(norma)) continue;
      const filaProducto = filasSugeridos[idx++];
      const producto = porClave.get(filaProducto.clave);
      if (!producto) {
        advertencias.push({
          hoja: HOJA_SUGERIDOS,
          fila: i + 1,
          detalle: `"${filaProducto.nombre}" tiene sugeridos pero no aparece en ${HOJA_INVENTARIO}; se omitió`,
        });
        continue;
      }
      for (const { col, sucursal } of COLUMNAS_SUCURSAL) {
        const { porDia, advertencia } = parsearSugerido(matrizSugeridos[i]?.[col] ?? null);
        if (advertencia) {
          advertencias.push({ hoja: HOJA_SUGERIDOS, fila: i + 1, detalle: `${sucursal}: ${advertencia}` });
        }
        for (const { dia, objetivo } of porDia) {
          reglas.push({ producto, sucursal, diaSemana: dia, objetivo });
          productosConRegla.add(producto.clave);
        }
      }
    }
  }

  const sinRegla = productos.filter((p) => !productosConRegla.has(p.clave));

  // 3. SQL ----------------------------------------------------------------------
  const lineas: string[] = [];
  lineas.push("-- =====================================================================");
  lineas.push("-- M2 — Catálogo real del cliente, generado por scripts/migrar-excel.ts");
  lineas.push(`-- Fuente: PRINCIPAL Auto inventario diario.xlsx · Generado: ${new Date().toISOString().slice(0, 10)}`);
  lineas.push("-- Reemplaza los datos de prueba de supabase/seed.sql.");
  lineas.push("-- =====================================================================");
  lineas.push("");
  lineas.push("begin;");
  lineas.push("");
  lineas.push("-- Limpieza de datos de prueba (ninguna sucursal ha capturado datos reales)");
  lineas.push("delete from reglas_sugerido;");
  lineas.push("delete from movimientos_diarios;");
  lineas.push("delete from cierres_dia;");
  lineas.push("delete from productos;");
  lineas.push("delete from departamentos;");
  lineas.push("");
  lineas.push("-- Departamentos (una sección del Excel = un departamento)");
  lineas.push("insert into departamentos (nombre) values");
  lineas.push(SECCIONES.map((s) => `  (${sqlTexto(s)})`).join(",\n") + ";");
  lineas.push("");
  lineas.push("-- Productos");
  lineas.push("insert into productos (nombre, categoria, tamano, departamento_id, lleva_decoracion) values");
  lineas.push(
    productos
      .map(
        (p) =>
          `  (${sqlTexto(p.nombre)}, ${sqlTexto(p.categoria)}, ${sqlTextoONulo(p.tamano)}, ` +
          `(select id from departamentos where nombre = ${sqlTexto(p.categoria)}), ${p.llevaDecoracion})`
      )
      .join(",\n") + ";"
  );
  lineas.push("");
  lineas.push("-- Reglas de sugeridos (dia_semana: 0=domingo … 6=sábado; null = todos los días)");
  lineas.push("insert into reglas_sugerido (producto_id, sucursal_id, dia_semana, objetivo)");
  lineas.push("select p.id, s.id, v.dia_semana, v.objetivo");
  lineas.push("from (values");
  lineas.push(
    reglas
      .map(
        (r, i) =>
          `  (${sqlTexto(r.producto.nombre)}, ${sqlTextoONulo(r.producto.tamano)}, ${sqlTexto(r.sucursal)}, ` +
          `${r.diaSemana === null ? "null" : r.diaSemana}${i === 0 ? "::smallint" : ""}, ${r.objetivo})`
      )
      .join(",\n")
  );
  lineas.push(") as v(nombre, tamano, sucursal, dia_semana, objetivo)");
  lineas.push("join productos p on p.nombre = v.nombre and p.tamano is not distinct from v.tamano");
  lineas.push("join sucursales s on s.nombre = v.sucursal;");
  lineas.push("");
  lineas.push("commit;");
  lineas.push("");

  const rutaSql = resolve(raiz, "supabase/migrations/0003_catalogo_cliente.sql");
  mkdirSync(dirname(rutaSql), { recursive: true });
  writeFileSync(rutaSql, lineas.join("\n"), "utf8");

  // 4. Reporte de validación ------------------------------------------------------
  const md: string[] = [];
  md.push("# M2 — Reporte de migración del Excel (para validar con la administradora)");
  md.push("");
  md.push(`Generado por \`scripts/migrar-excel.ts\` el ${new Date().toISOString().slice(0, 10)}.`);
  md.push("");
  md.push("## Resumen");
  md.push("");
  md.push(`| Qué | Cantidad |`);
  md.push(`|---|---|`);
  md.push(`| Departamentos (secciones del Excel) | ${SECCIONES.length} |`);
  md.push(`| Productos | ${productos.length} |`);
  md.push(`| Reglas de sugeridos | ${reglas.length} |`);
  md.push(`| Productos sin ninguna regla | ${sinRegla.length} |`);
  md.push(`| Advertencias a revisar | ${advertencias.length} |`);
  md.push("");
  md.push("## Cómo se interpretaron las reglas del Excel");
  md.push("");
  md.push("| Texto en el Excel | Interpretación |");
  md.push("|---|---|");
  md.push('| `12` o `12 DIARIOS` | 12 todos los días |');
  md.push('| `4 M-J / 2 V-L` | 4 de martes a jueves; 2 de viernes a lunes |');
  md.push('| `8 S/D 12` | 8 de lunes a viernes; 12 sábado y domingo |');
  md.push('| `1V/2S` | 1 el viernes, 2 el sábado; el resto de días sin producción |');
  md.push('| `2 Y 2` / `24 / 12` | producto combinado: se sumó (ver advertencias) |');
  md.push("");
  md.push("**⚠️ Confirmar con la administradora que estas lecturas son correctas antes de dar por cerrado M2.**");
  md.push("");
  md.push("## Decoración");
  md.push("");
  md.push(
    `Se marcó \`lleva_decoracion\` a los productos de las secciones: ${[...SECCIONES_DECORACION].join(", ")} (excepto porciones). Confirmar.`
  );
  md.push("");
  if (sinRegla.length > 0) {
    md.push("## Productos sin regla de sugerido");
    md.push("");
    for (const p of sinRegla) md.push(`- ${p.nombre}${p.tamano ? ` ${p.tamano}` : ""} (${p.categoria})`);
    md.push("");
  }
  md.push("## Advertencias");
  md.push("");
  if (advertencias.length === 0) {
    md.push("Ninguna.");
  } else {
    md.push("| Hoja | Fila | Detalle |");
    md.push("|---|---|---|");
    for (const a of advertencias) md.push(`| ${a.hoja} | ${a.fila} | ${a.detalle} |`);
  }
  md.push("");
  md.push("## Casos de prueba sugeridos (verificar contra el Excel impreso)");
  md.push("");
  const muestras = [reglas[0], reglas[Math.floor(reglas.length / 2)], reglas[reglas.length - 1]].filter(
    (r): r is Regla => r !== undefined
  );
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  for (const r of muestras) {
    md.push(
      `- **${r.producto.nombre}${r.producto.tamano ? ` ${r.producto.tamano}` : ""}** en ${r.sucursal}: objetivo ${r.objetivo}` +
        ` (${r.diaSemana === null ? "todos los días" : DIAS[r.diaSemana]})`
    );
  }
  md.push("");

  const rutaMd = resolve(raiz, "docs/M2-validacion.md");
  writeFileSync(rutaMd, md.join("\n"), "utf8");

  console.log(`✔ ${productos.length} productos, ${SECCIONES.length} departamentos, ${reglas.length} reglas`);
  console.log(`✔ SQL:     ${rutaSql}`);
  console.log(`✔ Reporte: ${rutaMd}`);
  if (advertencias.length > 0) console.log(`⚠ ${advertencias.length} advertencias — ver el reporte`);
}

// Solo correr como CLI; los tests importan parsearSugerido sin efectos.
const esEjecucionDirecta =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esEjecucionDirecta) main();
