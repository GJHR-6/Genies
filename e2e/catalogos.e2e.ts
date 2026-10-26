import { expect, test } from "@playwright/test";
import { PREFIJO, SUCURSAL_PRUEBA, admin, leerEstado, sesion } from "./datos";

/**
 * Catálogos: pantallas independientes y altas/ediciones reales. Todo lo
 * creado lleva el prefijo "E2E " y la limpieza final lo borra; el producto
 * se crea INACTIVO para que ninguna tienda lo vea.
 */
test.use({ storageState: sesion("admin") });
test.describe.configure({ mode: "serial" });

const SECCIONES = [
  ["Productos", /\/catalogos\/productos$/],
  ["Objetivos por tienda", /\/catalogos\/reglas$/],
  ["Pasteleras", /\/pasteleras$/],
  ["Áreas de producción", /\/catalogos\/areas$/],
  ["Departamentos", /\/catalogos\/departamentos$/],
  ["Usuarios", /\/catalogos\/usuarios$/],
] as const;

test("la portada tiene una tarjeta por catálogo y cada una abre sola", async ({ page }) => {
  for (const [titulo, url] of SECCIONES) {
    await page.goto("/catalogos");
    await page
      .getByRole("main")
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: titulo, exact: true }) })
      .click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Menú principal" }).getByRole("link", { name: "Catálogos" })
    ).toHaveAttribute("aria-current", "page");
  }
});

test("Productos: crear uno inactivo, encontrarlo y editarlo", async ({ page }) => {
  const nombre = `${PREFIJO}Pastel de prueba`;
  await page.goto("/catalogos/productos");
  await page.getByRole("button", { name: "Nuevo producto" }).click();

  const dialogo = page.getByRole("dialog", { name: "Nuevo producto" });
  await dialogo.getByLabel("Nombre").fill(nombre);
  await dialogo.getByRole("switch", { name: /^Activo/ }).click();
  await expect(dialogo.getByRole("switch", { name: /^Activo/ })).toHaveAttribute("aria-checked", "false");
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo).toHaveCount(0);

  // Inactivo: no aparece en "Activos", sí en "Inactivos".
  await page.getByRole("searchbox").fill(nombre);
  await expect(page.getByText("No hay productos que coincidan")).toBeVisible();
  await page.getByRole("button", { name: "Inactivos", exact: true }).click();
  const fila = page.getByRole("button", { name: new RegExp(nombre) });
  await expect(fila).toBeVisible();

  await fila.click();
  const edicion = page.getByRole("dialog", { name: "Editar producto" });
  await edicion.getByLabel("Tamaño").fill("8X2");
  await edicion.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: new RegExp(`${nombre} · 8X2`) })).toBeVisible();

  const { data } = await admin().from("productos").select("activo, tamano").eq("nombre", nombre).single();
  expect(data).toEqual({ activo: false, tamano: "8X2" });
});

test("Productos: un nombre vacío muestra un mensaje claro", async ({ page }) => {
  await page.goto("/catalogos/productos");
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo producto" });
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo.getByRole("alert")).toHaveText("Escribí el nombre.");
});

test("Objetivos: cambiar uno, guardarlo y quitarlo", async ({ page }) => {
  const producto = leerEstado()?.productoReglas;
  test.skip(!producto, `No hay productos con objetivos en ${SUCURSAL_PRUEBA}`);
  await page.goto(`/catalogos/reglas?producto=${producto}`);

  const celda = page.getByRole("textbox", { name: `Objetivo de ${SUCURSAL_PRUEBA}, Domingo` });
  await celda.fill("9");
  await page.getByRole("button", { name: "Guardar 1 cambio" }).click();
  await expect(page.getByText("Objetivos guardados.")).toBeVisible();

  await page.reload();
  await expect(celda).toHaveValue("9");

  await celda.fill("");
  await page.getByRole("button", { name: "Guardar 1 cambio" }).click();
  await expect(page.getByText("Objetivos guardados.")).toBeVisible();
  await page.reload();
  await expect(celda).toHaveValue("");
});

test("Departamentos: crear uno y desactivarlo", async ({ page }) => {
  const nombre = `${PREFIJO}Departamento`;
  await page.goto("/catalogos/departamentos");
  await page.getByRole("button", { name: "Nuevo departamento" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo departamento" });
  await dialogo.getByLabel("Nombre").fill(nombre);
  await dialogo.getByRole("button", { name: "Guardar" }).click();

  const tarjeta = page.getByRole("button", { name: new RegExp(nombre) });
  await expect(tarjeta).toContainText("Activo");
  await tarjeta.click();
  await page.getByRole("dialog").getByRole("switch", { name: /^Activo/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(tarjeta).toContainText("Inactivo");
});

test("Usuarios: crear una cuenta de tienda que puede entrar", async ({ page, browser }) => {
  await page.goto("/catalogos/usuarios");
  const boton = page.getByRole("button", { name: "Nuevo usuario" });
  test.skip(
    await boton.isDisabled(),
    "El servidor no tiene SUPABASE_SERVICE_ROLE_KEY: no se pueden crear cuentas"
  );

  const correo = `e2e-${Date.now()}@genies.test`;
  const clave = "Prueba-E2E-2026";
  await boton.click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo usuario" });
  await dialogo.getByLabel("Nombre", { exact: true }).fill(`${PREFIJO}Encargada`);
  await dialogo.getByLabel("Correo", { exact: true }).fill(correo);
  await dialogo.getByLabel("Contraseña", { exact: true }).fill(clave);
  await dialogo.getByRole("radio", { name: /^Tienda/ }).check();
  await dialogo.getByLabel("Sucursal", { exact: true }).selectOption({ label: SUCURSAL_PRUEBA });
  await dialogo.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText(correo)).toBeVisible();

  // La cuenta nueva entra y cae en el inventario de su sucursal.
  const nueva = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    storageState: { cookies: [], origins: [] },
  });
  const p = await nueva.newPage();
  await p.goto("/login");
  await p.locator("#email").fill(correo);
  await p.locator("#password").fill(clave);
  await p.locator('button[type="submit"]').click();
  await expect(p).toHaveURL(/\/captura$/);
  await expect(p.getByText(SUCURSAL_PRUEBA).first()).toBeVisible();
  await nueva.close();
});

test("principal no entra a catálogos ni a la portada del admin", async ({ browser }) => {
  const ctx = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    storageState: sesion("principal"),
  });
  const p = await ctx.newPage();
  for (const ruta of ["/catalogos", "/catalogos/usuarios", "/pasteleras", "/hoy"]) {
    await p.goto(ruta);
    await expect(p).toHaveURL(/\/captura$/);
  }
  await expect(
    p.getByRole("navigation", { name: "Menú principal" }).getByRole("link")
  ).toHaveText(["Inventario", "Rotación", "Historial"]);
  await ctx.close();
});
