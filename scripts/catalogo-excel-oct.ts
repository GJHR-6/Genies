/**
 * Catálogo desde el Excel nuevo (PRINCIPAL Auto inventario diario, 20 oct 2026).
 *
 * Genera supabase/migrations/0012_catalogo_excel_oct.sql:
 *  - renombra los productos que son el mismo con otro nombre (por id, así
 *    conservan historial y objetivos);
 *  - crea los productos nuevos con sus objetivos de "SUGERIDOS PARA CAMBIAR";
 *  - desactiva los que ya no están (nunca se borran);
 *  - pone `productos.orden` = fila de INVENTARIO DIARIO × 10 (los huecos
 *    dejan meter productos en medio desde Catálogos).
 *
 * Uso: npx tsx scripts/catalogo-excel-oct.ts "/ruta/PRINCIPAL Auto inventario diario.xlsx"
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLUMNAS_SUCURSAL,
  HOJA_INVENTARIO,
  HOJA_SUGERIDOS,
  parsearFilas,
  parsearSugerido,
  type Advertencia,
  type Celda,
} from "./migrar-excel";

/** Mismo producto, otro nombre (validado con el usuario el 20 oct 2026). */
const RENOMBRES: { id: number; nombre: string }[] = [
  { id: 36, nombre: "VOLTEADO MINI CAKE" },
  { id: 60, nombre: "MINI BRAZO GITANO" },
  { id: 87, nombre: "CHEESECAKE GR F-O-MAR" },
  { id: 88, nombre: "Porciones CHEESECAKE GR F-O-MAR" },
  { id: 89, nombre: "CHEESECAKE---- PEQ F-O-MAR" },
  { id: 92, nombre: "VASOS CHEESECAKE FRESA" },
  { id: 93, nombre: "VASOS CHOCOLATE OREO" },
];

/** Ya no están en el Excel: se desactivan. */
const DESACTIVAR = [58, 75, 90, 91, 94, 117, 118];

const sql = (s: string) => `'${s.replace(/'/g, "''")}'`;
const sqlONulo = (s: string | null) => (s === null ? "null" : sql(s));
const condicion = (nombre: string, tamano: string | null) =>
  `nombre = ${sql(nombre)} and tamano is not distinct from ${sqlONulo(tamano)}`;

function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error('Uso: npx tsx scripts/catalogo-excel-oct.ts "/ruta/al/Excel.xlsx"');
    process.exit(1);
  }
  const libro = XLSX.readFile(resolve(ruta));
  const advertencias: Advertencia[] = [];
  const matriz = (hoja: string): Celda[][] => {
    const ws = libro.Sheets[hoja];
    if (!ws) throw new Error(`No existe la hoja "${hoja}"`);
    return XLSX.utils.sheet_to_json<Celda[]>(ws, { header: 1, defval: null, raw: true });
  };

  const inv = matriz(HOJA_INVENTARIO);
  const filas = parsearFilas(inv.map((f) => f[0] ?? null), HOJA_INVENTARIO, advertencias);

  // Fila de Excel de cada producto (para el orden).
  const filaExcel = new Map<string, number>();
  {
    let k = 0;
    const columnaA = inv.map((f) => f[0] ?? null);
    for (let i = 1; i < columnaA.length && k < filas.length; i++) {
      const v = columnaA[i];
      if (v === null || String(v).trim() === "") continue;
      // parsearFilas salta encabezados de sección; avanzamos igual que él.
      const texto = String(v).replace(/\s+/g, " ").trim().toUpperCase();
      if (filas[k] && filaPareceDe(texto, filas[k])) {
        filaExcel.set(filas[k].clave, i + 1);
        k++;
      }
    }
  }

  // Objetivos de la hoja de sugeridos, por la misma clave de producto.
  const sug = matriz(HOJA_SUGERIDOS);
  // Como en migrar-excel: el rango de la hoja empieza en PRODUCTO (índice 0).
  const filasSug = parsearFilas(sug.map((f) => f[0] ?? null), HOJA_SUGERIDOS, advertencias);
  const filaSugPorClave = new Map<string, Celda[]>();
  {
    let k = 0;
    for (let i = 1; i < sug.length && k < filasSug.length; i++) {
      const v = sug[i][0];
      if (v === null || String(v).trim() === "") continue;
      const texto = String(v).replace(/\s+/g, " ").trim().toUpperCase();
      if (filaPareceDe(texto, filasSug[k])) {
        filaSugPorClave.set(filasSug[k].clave, sug[i]);
        k++;
      }
    }
  }

  const NUEVOS = [
    "GLASEADOS DE COCO MINICAKE",
    "PORCIONES BANANO",
    "VASOS PIE LECHE",
    "VASOS LIMON",
    "VASOS MARACUYA",
    "DURAZNO CHANTILLY 6",
  ];
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toUpperCase();

  const out: string[] = [];
  out.push("-- Generado por scripts/catalogo-excel-oct.ts — no editar a mano.");
  out.push("-- Fuente: PRINCIPAL Auto inventario diario.xlsx (20 oct 2026)");
  out.push("begin;");
  out.push("");
  out.push("-- 1. Renombres (mismo producto: conserva historial y objetivos)");
  for (const r of RENOMBRES) {
    out.push(`update productos set nombre = ${sql(r.nombre)} where id = ${r.id};`);
  }
  out.push("");
  out.push("-- 2. Ya no están en el Excel: se desactivan (no se borran)");
  out.push(`update productos set activo = false where id in (${DESACTIVAR.join(", ")});`);
  out.push("");
  out.push("-- 3. Productos nuevos (sin área: asignarla en Catálogos → Productos)");
  const nuevos = filas.filter((f) => NUEVOS.includes(norm(f.nombre)));
  if (nuevos.length !== NUEVOS.length) {
    throw new Error(`Esperaba ${NUEVOS.length} productos nuevos, encontré ${nuevos.length}`);
  }
  for (const f of nuevos) {
    out.push(
      `insert into productos (nombre, categoria, tamano, departamento_id, lleva_decoracion) values (` +
        `${sql(f.nombre)}, ${sql(f.seccion)}, ${sqlONulo(f.tamano)}, ` +
        `(select id from departamentos where nombre = ${sql(f.seccion)}), false);`
    );
  }
  out.push("");
  out.push("-- 4. Objetivos de los productos nuevos (hoja SUGERIDOS PARA CAMBIAR)");
  let reglas = 0;
  for (const f of nuevos) {
    const fila = filaSugPorClave.get(f.clave);
    if (!fila) {
      advertencias.push({ hoja: HOJA_SUGERIDOS, fila: 0, detalle: `Sin fila de sugeridos para "${f.nombre}"` });
      continue;
    }
    for (const { col, sucursal } of COLUMNAS_SUCURSAL) {
      const r = parsearSugerido(fila[col] ?? null);
      if (r.advertencia) {
        advertencias.push({ hoja: HOJA_SUGERIDOS, fila: 0, detalle: `${f.nombre} / ${sucursal}: ${r.advertencia}` });
      }
      for (const { dia, objetivo } of r.porDia) {
        out.push(
          `insert into reglas_sugerido (producto_id, sucursal_id, dia_semana, objetivo) ` +
            `select p.id, s.id, ${dia === null ? "null" : dia}, ${objetivo} from productos p, sucursales s ` +
            `where p.${condicion(f.nombre, f.tamano)} and s.nombre = ${sql(sucursal)};`
        );
        reglas++;
      }
    }
  }
  out.push("");
  out.push("-- 5. Orden de la lista = fila de INVENTARIO DIARIO × 10");
  out.push("update productos set orden = null;");
  const renombrePorNombre = new Map(RENOMBRES.map((r) => [norm(r.nombre), r.id]));
  for (const f of filas) {
    const fila = filaExcel.get(f.clave);
    if (fila === undefined) throw new Error(`Sin fila de Excel para ${f.clave}`);
    const id = renombrePorNombre.get(norm(f.nombre));
    out.push(
      id !== undefined
        ? `update productos set orden = ${fila * 10} where id = ${id};`
        : `update productos set orden = ${fila * 10} where ${condicion(f.nombre, f.tamano)} and activo;`
    );
  }
  out.push("");
  out.push("commit;");

  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const destino = resolve(raiz, "supabase/migrations/0012_catalogo_excel_oct.sql");
  writeFileSync(destino, out.join("\n") + "\n", "utf8");
  console.log(`✔ ${filas.length} filas, ${nuevos.length} nuevos, ${reglas} objetivos → ${destino}`);
  for (const a of advertencias) console.log(`⚠ ${a.hoja} fila ${a.fila}: ${a.detalle}`);
}

/** ¿El texto de la columna A corresponde a esta fila parseada? */
function filaPareceDe(texto: string, f: { nombre: string; tamano: string | null }): boolean {
  const n = f.nombre.replace(/\s+/g, " ").trim().toUpperCase();
  if (texto === "PORCIONES") return n.startsWith("PORCIONES ");
  if (f.tamano) return texto.replace(/\s*PULGADAS$/, "").replace(/\s*/g, "") === f.tamano;
  return texto === n;
}

main();
