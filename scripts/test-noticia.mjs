import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CON: ' + m.text()); });
await page.goto('https://rdzindu7.github.io/pains-acontece/pages/noticia.html?id=1783232923301', {
  waitUntil: 'networkidle',
  timeout: 45000
});
await page.waitForTimeout(5000);
const mainHtml = await page.locator('#main').innerHTML();
const hasArticle = await page.locator('.art-title').count();
console.log('hasArticle', hasArticle);
console.log('mainLen', mainHtml.length);
console.log('mainPreview', mainHtml.slice(0, 300));
console.log('errors', errors.length ? errors.join('\n') : 'none');
await browser.close();