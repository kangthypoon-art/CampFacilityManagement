import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle');

const initialMain = await page.textContent('main');
console.log('INITIAL:', initialMain?.slice(0, 80));

await page.locator('[data-testid="nav-item-supplies"]').click();
await page.waitForTimeout(400);
const afterSupplies = await page.textContent('main');
console.log('AFTER supplies:', afterSupplies?.slice(0, 80));

const changed = initialMain !== afterSupplies;
console.log('PAGE CHANGED after click:', changed);

// 콘솔 에러 캡처
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

await browser.close();
