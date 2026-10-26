import { expect, test } from "@playwright/test";
import { esDomingo, leerEstado, sesion, vaciarRepartoDeHoy } from "./datos";

/**
 * Reparto: el admin reparte y saca las hojas impresas por pastelera (la
 * cocina no usa tablet: trabaja con las hojas).
 */
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  test.skip(esDomingo(), "Domingo: sin producción");
  test.skip(
    !leerEstado()?.repartoLibre,
    "Ya había un reparto de hoy al empezar: no se toca un reparto real."
  );
  await vaciarRepartoDeHoy();
});

test.describe("admin", () => {
  test.use({ storageState: sesion("admin") });

  test("hace el reparto e imprime las hojas por pastelera", async ({ page }) => {
    await page.goto("/asignar");
    await expect(page.getByText("Todavía no hay reparto para hoy")).toBeVisible();

    await page.getByRole("button", { name: "Hacer el reparto" }).click();
    await expect(page.getByText(/^Listo: se repartieron \d+ trabajos/)).toBeVisible();
    // La tabla del reparto es grande: en modo desarrollo tarda en redibujarse.
    await expect(page.getByText(/^Hecho a las /)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Cómo leer la tabla:")).toBeVisible();

    await page.getByRole("link", { name: "Imprimir hojas" }).click();
    await expect(page).toHaveURL(/\/asignar\/imprimir$/);
    await expect(page.getByRole("heading", { name: "Hojas por pastelera" })).toBeVisible();
    await expect(page.getByText("Tanda 1").first()).toBeVisible();
  });

  test("Hoy dice que el reparto está listo para imprimir", async ({ page }) => {
    await page.goto("/hoy");
    await expect(page.getByText("Hecho: listo para imprimir")).toBeVisible();
    await expect(page.getByRole("link", { name: /Hoja completa/ })).toBeVisible();
  });
});
