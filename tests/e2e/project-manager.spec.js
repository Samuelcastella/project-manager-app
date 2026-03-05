import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("crear proyecto y verlo en lista", async ({ page }) => {
  await page.locator("#name").fill("Proyecto E2E");
  await page.locator("#owner").fill("Ana QA");
  await page.locator("#dueDate").fill("2026-03-20");
  await page.locator("#description").fill("Prueba automatizada");

  await page.getByRole("button", { name: "Guardar proyecto" }).click();

  await expect(page.getByText("Proyecto creado.")).toBeVisible();
  await expect(page.locator(".project-card h3").first()).toHaveText("Proyecto E2E");
  await expect(page.getByText("1 proyecto visible")).toBeVisible();
});

test("cambiar a kanban y cambiar estado", async ({ page }) => {
  await page.locator("#name").fill("Flujo Kanban");
  await page.locator("#owner").fill("Bruno");
  await page.locator("#dueDate").fill("2026-03-21");
  await page.getByRole("button", { name: "Guardar proyecto" }).click();

  await page.locator("#view-kanban").click();
  await expect(page.locator("#kanban-pendiente .project-card")).toHaveCount(1);

  await page.locator("#kanban-pendiente .project-card button[data-action='toggle-status']").first().click();
  await expect(page.locator("#kanban-en-progreso .project-card")).toHaveCount(1);
});
