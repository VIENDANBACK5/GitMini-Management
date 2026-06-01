const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  await page.goto('http://localhost:8099', { waitUntil: 'networkidle2' });
  
  try {
    await page.type('input[type="password"]', 'gitmini_password');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
    console.log('Login attempt completed.');
  } catch (e) {
    console.log('Could not login:', e.message);
  }

  await browser.close();
})();
