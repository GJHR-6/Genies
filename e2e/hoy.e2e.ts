import { expect, test, type Page } from "@playwright/test";
import { SUCURSAL_PRUEBA, esDomingo, sesion, vaciarDiaPrueba } from "./datos";

/** Trabajo diario del admin: portada Hoy y pantallas independientes. */
test.use({ storageState: sesion("admin") });
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await vaciarDiaPrueba();
});

// Sin reparto (16 nov): la hoja de cada pastelera es el cuadro de su área.
const TARJETAS = ["Tiendas", "Sugeridos", "Cuadros", "Lo que no se mandó"] as const;
const DESTINO: Record<(typeof TARJETAS)[number], RegExp> = {
  Tiendas: /\/dashboard$/,
  Sugeridos: /\/sugeridos$/,
  Cuadros: /\/cuadros$/,
  "Lo que no se mandó": /\/envios$/,
};

/** Tarjeta de la portada por su título (el nombre accesible incluye todo su texto). */
const tarjeta = (page: Page, titulo: string) =>
  page
    .getByRole("main")
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: titulo, exact: true }) });

/** Fila de botones del grupo "Hoy" que tiene cada pantalla del día. */
const botonesHoy = (page: Page) => page.getByRole("navigation", { name: "Hoy" });

test("el admin entra a «Hoy» con las 4 tarjetas y una sugerencia", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/hoy$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Buen(os|as) /);
  for (const t of TARJETAS) {
    await expect(tarjeta(page, t)).toBeVisible();
  }
  await expect(tarjeta(page, "Reparto")).toHaveCount(0);
  await expect(page.getByText("Sigue aquí").or(page.getByText("Hoy es domingo"))).toBeVisible();

  const menu = page.getByRole("navigation", { name: "Menú principal" });
  await expect(menu.getByRole("link", { name: "Hoy" })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("link")).toHaveText(["Hoy", "Catálogos", "Rotación", "Historial"]);
});

test("cada tarjeta abre su pantalla directo, en cualquier orden", async ({ page }) => {
  // Orden al revés del habitual: no hay pasos obligatorios.
  for (const t of [...TARJETAS].reverse()) {
    await page.goto("/hoy");
    await tarjeta(page, t).click();
    await expect(page).toHaveURL(DESTINO[t]);
    await expect(page.getByRole("heading", { level: 1, name: t })).toBeVisible();
    // El menú sigue marcando "Hoy" dentro de cualquier pantalla del día.
    await expect(
      page.getByRole("navigation", { name: "Menú principal" }).getByRole("link", { name: "Hoy" })
    ).toHaveAttribute("aria-current", "page");
  }
});

test("desde cualquier pantalla del día se salta a otra sin pasar por las demás", async ({ page }) => {
  await page.goto("/cuadros");
  await botonesHoy(page).getByRole("link", { name: "Tiendas" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await botonesHoy(page).getByRole("link", { name: "Lo que no se mandó" }).click();
  await expect(page).toHaveURL(/\/envios$/);
  await botonesHoy(page).getByRole("link", { name: "Sugeridos" }).click();
  await expect(page).toHaveURL(/\/sugeridos$/);
  await expect(botonesHoy(page).getByRole("link", { name: "Sugeridos" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  // Ya no existen los enlaces "siguiente →" / "← anterior".
  await expect(page.getByRole("link", { name: /→|←\s/ })).toHaveCount(0);
});

test("Tiendas: el admin cierra y vuelve a abrir el día de una tienda", async ({ page }) => {
  test.skip(esDomingo(), "Domingo: sin producción");
  await page.goto("/dashboard");
  const tienda = page
    .locator("div.rounded-2xl")
    .filter({ has: page.getByRole("heading", { name: SUCURSAL_PRUEBA, exact: true }) });

  await tienda.getByRole("button", { name: "Cerrar el día" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText(`¿Cerrar el día de ${SUCURSAL_PRUEBA}?`);
  await dialogo.getByRole("button", { name: "Cerrar el día" }).click();
  await expect(tienda.getByText("Terminó ✓")).toBeVisible();

  await tienda.getByRole("button", { name: "Volver a abrir" }).click();
  await expect(tienda.getByText("Terminó ✓")).toHaveCount(0);
  await expect(tienda.getByRole("button", { name: "Cerrar el día" })).toBeVisible();
});

test("Sugeridos: cambiar un número a mano y volver al calculado", async ({ page }) => {
  test.skip(esDomingo(), "Domingo: sin producción");
  await page.goto("/sugeridos");
  await expect(page.getByText("¿De dónde sale el número?")).toBeVisible();

  const celda = page.getByRole("button", { name: new RegExp(`en ${SUCURSAL_PRUEBA}: \\d+$`) }).first();
  const etiqueta = (await celda.getAttribute("aria-label"))!;
  const producto = etiqueta.replace(/^Sugerido de /, "").replace(/ en .*$/, "");

  await celda.click();
  const campo = page.getByRole("textbox", { name: `Sugerido de ${producto} en ${SUCURSAL_PRUEBA}` });
  await campo.fill("77");
  await campo.press("Enter");
  const ajustada = page.getByRole("button", {
    name: `Sugerido de ${producto} en ${SUCURSAL_PRUEBA}: 77 (ajustado)`,
  });
  await expect(ajustada).toBeVisible();

  await page.reload();
  await expect(ajustada).toBeVisible();

  // Vacío = vuelve al calculado.
  await ajustada.click();
  await campo.fill("");
  await campo.press("Enter");
  await expect(ajustada).toHaveCount(0);
});

test("Hoy: las hojas para imprimir abren cada una lo suyo", async ({ page }) => {
  test.skip(esDomingo(), "Domingo: sin hojas");
  await page.goto("/hoy");
  const hoja = (href: string) => page.getByRole("main").locator(`a[href="${href}"]`);
  await expect(hoja("/cuadros?ver=completo")).toContainText("Cuadro completo");
  await expect(hoja("/cuadros?ver=areas")).toContainText("Hoja de cada pastelera");
  await expect(hoja("/cuadros/despacho")).toContainText("Hoja de cada tienda");
  await expect(page.getByText("Hoja completa")).toHaveCount(0);
});

test("Cuadros: se elige qué ver e imprimir", async ({ page }) => {
  test.skip(esDomingo(), "Domingo: sin cuadros");
  const completo = page.getByRole("heading", { name: "Cuadro completo (como el Excel)" });
  const deArea = page.getByRole("heading", { name: /^Cuadro de producción — / }).first();

  await page.goto("/cuadros?ver=completo");
  await expect(page.getByRole("button", { name: "Imprimir cuadro completo" })).toBeVisible();
  await expect(completo).toBeVisible();
  await expect(page.locator("article thead").first()).toContainText(SUCURSAL_PRUEBA);
  await expect(deArea).toHaveCount(0);

  await page.getByRole("link", { name: "Hoja de cada pastelera" }).click();
  await expect(page).toHaveURL(/\/cuadros\?ver=areas$/);
  await expect(page.getByRole("button", { name: "Imprimir hojas de pasteleras" })).toBeVisible();
  await expect(deArea).toBeVisible();
  await expect(completo).toHaveCount(0);

  await page.getByRole("link", { name: "Todo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Imprimir todo" })).toBeVisible();
  await expect(completo).toBeVisible();
  await expect(deArea).toBeVisible();
});

test("Hoja de cada tienda: sin hoja completa ni casilla «No se mandó» en el papel", async ({ page }) => {
  test.skip(esDomingo(), "Domingo: sin despacho");
  await page.goto("/cuadros/despacho");
  await expect(page.getByRole("heading", { level: 1, name: "Hoja de cada tienda" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimir hojas de tiendas" })).toBeVisible();
  await expect(page.getByText("Inventario diario — hoja completa")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "No se mandó" })).toHaveCount(0);
});
