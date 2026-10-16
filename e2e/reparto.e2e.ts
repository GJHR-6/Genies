import { expect, test } from "@playwright/test";
import { esDomingo, leerEstado, sesion, vaciarRepartoDeHoy } from "./datos";

/**
 * Reparto completo: el admin reparte y envía a cocina, una pastelera marca
 * un producto como listo en la tablet de Principal y el admin ve el avance.
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

  test("hace el reparto y lo envía a cocina", async ({ page }) => {
    await page.goto("/asignar");
    await expect(page.getByText("Todavía no hay reparto para hoy")).toBeVisible();

    await page.getByRole("button", { name: "Hacer el reparto" }).click();
    await expect(page.getByText(/^Listo: se repartieron \d+ trabajos/)).toBeVisible();
    await expect(page.getByText("Sin enviar a cocina")).toBeVisible();
    await expect(page.getByText("Cómo leer la tabla:")).toBeVisible();

    await page.getByRole("button", { name: "Enviar a cocina" }).click();
    await expect(page.getByText(/^Enviado: las pasteleras ya lo ven/)).toBeVisible();
    // La tabla del reparto es grande: en modo desarrollo tarda en redibujarse.
    await expect(page.getByText(/^Enviado a cocina/)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: "Quitar de la cocina" })).toBeVisible();
  });
});

test.describe("tablet de cocina", () => {
  test.use({ storageState: sesion("principal") });

  test("una pastelera sin PIN marca un producto como listo", async ({ page }) => {
    await page.goto("/cocina");
    await expect(page.getByRole("heading", { name: "¿Quién sos?" })).toBeVisible();

    const sinPin = page
      .getByRole("button")
      .filter({ hasText: /de \d+ listas/ })
      .filter({ hasNotText: "con PIN" })
      .first();
    const nombre = (await sinPin.locator("p").first().textContent())!.trim();
    await sinPin.click();

    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    await page.getByRole("button", { name: "✓ Listo" }).first().click();
    await expect(page.getByRole("button", { name: "Deshacer" }).first()).toBeVisible();
    await expect(page.getByText(/^1 de \d+ listas/)).toBeVisible();

    // El de la tablet (el del encabezado cierra la sesión).
    await page.getByRole("main").getByRole("button", { name: "Salir" }).click();
    await expect(page.getByRole("heading", { name: "¿Quién sos?" })).toBeVisible();
  });
});

test.describe("admin ve el avance", () => {
  test.use({ storageState: sesion("admin") });

  test("Reparto y Hoy muestran lo que hizo la cocina", async ({ page }) => {
    await page.goto("/asignar");
    await expect(page.getByText(/[1-9]\d* de \d+ unidades hechas/)).toBeVisible();

    await page.goto("/hoy");
    await expect(page.getByText(/^En cocina: [1-9]\d* de \d+$/)).toBeVisible();
  });
});
