const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const source = process.argv[2];
  const outputDir = process.argv[3];
  if (!source || !outputDir) {
    throw new Error('Usage: node capture_wiring_diagrams.js <html> <output-dir>');
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.resolve(source)).href);

  const views = [
    ['schematic', 'RC-Car-V1_车辆原理连接.png'],
    ['placement', 'RC-Car-V1_洞洞板元件面.png'],
    ['solder', 'RC-Car-V1_洞洞板焊接面.png'],
    ['remote', 'RC-Car-V1_遥控器接线.png'],
  ];

  for (const [view, filename] of views) {
    await page.locator(`[data-view="${view}"]`).click();
    await page.locator(`[data-panel="${view}"] svg`).screenshot({
      path: path.join(outputDir, filename),
      animations: 'disabled',
    });
  }

  await browser.close();
})();
