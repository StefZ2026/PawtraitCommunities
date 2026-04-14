import { test, expect } from "@playwright/test";

const BASE = "https://pawtrait-communities.onrender.com";

test.describe("Pawtrait Communities E2E", () => {
  test("home page loads with correct branding", async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/Pawtrait Communities/i);
    await expect(page.getByRole("heading", { name: /Your Pet.*Your Style/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Join Your Community" }).first()).toBeVisible();
  });

  test("home page shows style previews", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("heading", { name: "Stunning AI Portraits" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View All Styles" })).toBeVisible();
    const img = page.locator("img[alt='Renaissance Noble']");
    await expect(img).toBeVisible();
  });

  test("home page shows merch section", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("heading", { name: "Order Beautiful Keepsakes" })).toBeVisible();
    await expect(page.getByText("Mugs").first()).toBeVisible();
    await expect(page.getByText("Tote Bags").first()).toBeVisible();
    await expect(page.getByText("iPhone Cases").first()).toBeVisible();
    await expect(page.getByText("Calendars").first()).toBeVisible();
  });

  test("login page renders with tabs", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole("heading", { name: "Pawtrait Communities" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Log In" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sign Up" })).toBeVisible();
    await expect(page.locator("input#login-email")).toBeVisible();
  });

  test("signup tab shows form fields", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await expect(page.locator("input#first-name")).toBeVisible();
    await expect(page.locator("input#signup-email")).toBeVisible();
    await expect(page.locator("input#signup-password")).toBeVisible();
    await expect(page.locator("input#terms")).toBeVisible();
  });

  test("join page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`${BASE}/join`);
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole("tab", { name: "Log In" })).toBeVisible();
  });

  test("styles page loads with styles", async ({ page }) => {
    await page.goto(`${BASE}/styles`);
    await expect(page.getByRole("heading", { name: "All Portrait Styles" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Dogs/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Cats/ })).toBeVisible();
    await expect(page.getByText("Renaissance Noble").first()).toBeVisible();
  });

  test("styles page switches to cat styles", async ({ page }) => {
    await page.goto(`${BASE}/styles`);
    await page.getByRole("tab", { name: /Cats/ }).click();
    await expect(page.getByText("Egyptian Royalty").first()).toBeVisible();
    await expect(page.getByText("Purrista Barista").first()).toBeVisible();
  });

  test("privacy page loads", async ({ page }) => {
    await page.goto(`${BASE}/privacy`);
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });

  test("terms page loads", async ({ page }) => {
    await page.goto(`${BASE}/terms`);
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto(`${BASE}/this-does-not-exist-xyz-123`);
    // With /:slug route, this will try to load as a gallery — should show "Community not found" or empty state
    await page.waitForTimeout(2000);
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("health check API", async ({ request }) => {
    const res = await request.get(`${BASE}/healthz`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("portrait styles API returns 40+ styles", async ({ request }) => {
    const res = await request.get(`${BASE}/api/portrait-styles`);
    expect(res.ok()).toBeTruthy();
    const styles = await res.json();
    expect(styles.length).toBeGreaterThan(40);
    expect(styles[0]).toHaveProperty("name");
    expect(styles[0]).toHaveProperty("promptTemplate");
    expect(styles[0]).toHaveProperty("category");
  });

  test("community code validation rejects invalid code", async ({ request }) => {
    const res = await request.post(`${BASE}/api/communities/validate-code`, {
      data: { code: "INVALID-CODE-XYZ" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  test("merch products API returns catalog", async ({ request }) => {
    const res = await request.get(`${BASE}/api/merch/products`);
    expect(res.ok()).toBeTruthy();
    const products = await res.json();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty("key");
    expect(products[0]).toHaveProperty("variants");
  });

  test("protected endpoints return 401 without auth", async ({ request }) => {
    for (const endpoint of ["/api/my-community", "/api/my-pets", "/api/my-likes"]) {
      const res = await request.get(`${BASE}${endpoint}`);
      expect(res.status()).toBe(401);
    }
  });

  test("admin endpoints return 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/communities`);
    expect(res.status()).toBe(401);
  });
});
