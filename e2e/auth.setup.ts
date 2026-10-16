import { expect, test as setup } from "@playwright/test";
import { USUARIOS, sesion, type Rol } from "./datos";

/** Inicia sesión por la pantalla de login y guarda la sesión de cada rol. */
const INICIO: Record<Rol, RegExp> = {
  admin: /\/hoy$/,
  tienda: /\/captura$/,
  principal: /\/captura$/,
};

for (const rol of Object.keys(USUARIOS) as Rol[]) {
  setup(`sesión de ${rol}`, async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(USUARIOS[rol].email);
    await page.locator("#password").fill(USUARIOS[rol].password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(INICIO[rol]);
    await page.context().storageState({ path: sesion(rol) });
  });
}
