import { expect, test } from "@playwright/test";
import { admin, esDomingo, hoy, idSucursalPrueba, sesion, vaciarDiaPrueba } from "./datos";

/** La encargada en su celular (360 px): anota, se guarda solo y termina el día. */
test.use({ storageState: sesion("tienda") });
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await vaciarDiaPrueba();
});

test("entra directo a «Inventario de hoy» y el menú es el de tienda", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/captura$/);
  await expect(page.getByRole("heading", { name: "Inventario de hoy" })).toBeVisible();

  const menu = page.getByRole("navigation", { name: "Menú principal" });
  await expect(menu.getByRole("link", { name: "Inventario" })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("link", { name: "Historial" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Hoy" })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Cocina" })).toHaveCount(0);

  // Móvil primero: nada se sale de la pantalla a lo ancho.
  const anchoExtra = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(anchoExtra).toBeLessThanOrEqual(0);
});

test("anota un ingreso, se guarda solo y sigue ahí al recargar", async ({ page }) => {
  await page.goto("/captura");
  const ingreso = page.getByRole("textbox", { name: /^Ingreso de / }).first();
  const nombre = (await ingreso.getAttribute("aria-label"))!.replace(/^Ingreso de /, "");

  await ingreso.fill("5");
  await ingreso.press("Tab");
  await expect(page.getByText("Guardado ✓").first()).toBeVisible();

  // Llegó a la base (no solo a la pantalla).
  const sucursal = await idSucursalPrueba();
  await expect
    .poll(async () => {
      const { data } = await admin()
        .from("movimientos_diarios")
        .select("ingreso")
        .eq("fecha", hoy())
        .eq("sucursal_id", sucursal)
        .eq("ingreso", 5);
      return data?.length ?? 0;
    })
    .toBe(1);

  await page.reload();
  await expect(page.getByRole("textbox", { name: `Ingreso de ${nombre}` })).toHaveValue("5");
  await expect(page.getByText(/1 de \d+ anotados/)).toBeVisible();
});

test("sin internet sigue anotando y guarda cuando vuelve la señal", async ({ page, context }) => {
  await page.goto("/captura");
  const pedido = page.getByRole("textbox", { name: /^Pedido de / }).first();

  await context.setOffline(true);
  await pedido.fill("3");
  await pedido.press("Tab");
  await expect(page.getByText(/Sin internet/)).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/Sin internet/)).toHaveCount(0);
  await expect
    .poll(async () => {
      const { data } = await admin()
        .from("movimientos_diarios")
        .select("pedido")
        .eq("fecha", hoy())
        .eq("sucursal_id", await idSucursalPrueba())
        .eq("pedido", 3);
      return data?.length ?? 0;
    }, { timeout: 30_000 })
    .toBe(1);
});

test("el buscador filtra la lista", async ({ page }) => {
  await page.goto("/captura");
  const primero = page.getByRole("textbox", { name: /^Ingreso de / }).first();
  const nombre = (await primero.getAttribute("aria-label"))!.replace(/^Ingreso de /, "");

  await page.getByRole("searchbox", { name: "Buscar producto" }).fill(nombre);
  await expect(page.getByRole("textbox", { name: `Ingreso de ${nombre}` })).toBeVisible();
  const visibles = await page.getByRole("textbox", { name: /^Ingreso de / }).count();
  expect(visibles).toBeLessThan(10);

  await page.getByRole("searchbox", { name: "Buscar producto" }).fill("zzz-no-existe");
  await expect(page.getByText(/Ningún producto coincide/)).toBeVisible();
});

test("«Terminé el inventario de hoy» cierra el día y ya no deja editar", async ({ page }) => {
  test.skip(esDomingo(), "Domingo: sin producción");
  await page.goto("/captura");
  await page.getByRole("button", { name: "Terminé el inventario de hoy" }).click();
  const dialogo = page.getByRole("dialog", { name: "¿Terminaste el inventario?" });
  await expect(dialogo).toContainText(/Anotaste \d+ de \d+ productos/);
  await dialogo.getByRole("button", { name: "Sí, terminé" }).click();

  await expect(page.getByText("Ya terminaste el inventario de hoy")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Ingreso de / }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Terminé el inventario de hoy" })).toHaveCount(0);
});

test("la tienda no puede abrir pantallas de administración", async ({ page }) => {
  for (const ruta of ["/hoy", "/catalogos", "/sugeridos", "/asignar"]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/captura$/);
  }
});
