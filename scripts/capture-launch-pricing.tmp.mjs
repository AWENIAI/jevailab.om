import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000/launch-pricing', { waitUntil: 'networkidle' });
await page.getByTestId('launch-plan-starter').waitFor();
await page.screenshot({ path: 'launch-pricing-offer-1440.png', fullPage: false });
const starter = await page.getByTestId('launch-plan-starter').boundingBox();
const countdown = await page.getByTestId('launch-countdown').boundingBox();
console.log(JSON.stringify({ starter, countdown, scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth), innerWidth: await page.evaluate(() => window.innerWidth) }));
await browser.close();
