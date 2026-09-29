import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test("catalog to detail at " + viewport.width + "px", async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Everyday layers/ }),
    ).toBeVisible();
    await expect(page.locator(".card")).toHaveCount(8);
    await page
      .getByRole("searchbox", { name: "Search garments" })
      .fill("canvas");
    await page
      .getByRole("searchbox", { name: "Search garments" })
      .press("Enter");
    await expect(page.locator(".card")).toHaveCount(1);
    await page.getByRole("link", { name: /Canvas Overshirt/ }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Canvas Overshirt" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row", { name: /M 102 68 43/ })).toBeVisible();
  });
}
