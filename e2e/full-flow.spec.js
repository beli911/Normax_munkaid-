// E2E: teljes flow teszt + képernyőképek
// Futtatás: npx playwright test e2e/full-flow.spec.js --project=chromium
// Képek: teszt-kepernyokepek/

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USERNAME = 'benner213';
const PASSWORD = 'Belike911';
const SCREENSHOT_DIR = 'teszt-kepernyokepek';

test.describe('Teljes flow – bejelentkezés, főoldal, admin, bérszámfejtés', () => {
  test('1. Login oldal üres', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Bejelentkezés' })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login-ures.png`, fullPage: true });
  });

  test('2. Login űrlap kitöltve', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByPlaceholder('pl. kovacs.janos').fill(USERNAME);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-login-kitoltve.png`, fullPage: true });
  });

  test('3. Bejelentkezés és főoldal', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByPlaceholder('pl. kovacs.janos').fill(USERNAME);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /Belépés|Betöltés/ }).click();
    await expect(page).toHaveURL(/\/(|\?.*)$/, { timeout: 20000 });
    await page.getByRole('heading', { name: 'Munkaidő' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-fooldal-bejelentkezve.png`, fullPage: true });
  });

  test('4. Admin oldal', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByPlaceholder('pl. kovacs.janos').fill(USERNAME);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /Belépés|Betöltés/ }).click();
    await page.waitForURL(/\/(|\?.*)$/, { timeout: 20000 });
    await page.getByRole('heading', { name: 'Munkaidő' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-admin-oldal.png`, fullPage: true });
  });

  test('5. Bérszámfejtés (havi)', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByPlaceholder('pl. kovacs.janos').fill(USERNAME);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /Belépés|Betöltés/ }).click();
    await page.waitForURL(/\/(|\?.*)$/, { timeout: 20000 });
    await page.getByRole('heading', { name: 'Munkaidő' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.goto(`${BASE_URL}/admin/payroll`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-payroll-havi.png`, fullPage: true });
  });

  test('6. Főoldal – munkaidő űrlap és lista', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByPlaceholder('pl. kovacs.janos').fill(USERNAME);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /Belépés|Betöltés/ }).click();
    await page.waitForURL(/\/(|\?.*)$/, { timeout: 20000 });
    await page.getByRole('heading', { name: 'Munkaidő' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-fooldal-uj-bejegyzes.png`, fullPage: true });
  });
});
