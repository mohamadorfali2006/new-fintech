const { chromium } = require("playwright");
const path = require("path");

const OUT = path.join(__dirname, "..", "docs", "showcase");
const PAGES = [
  { name: "landing", url: "http://localhost:3000/" },
  { name: "login", url: "http://localhost:3000/login" },
  { name: "register", url: "http://localhost:3000/register" },
];

(async () => {
  const fs = require("fs");
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const p of PAGES) {
    await page.goto(p.url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);
    const dest = path.join(OUT, `${p.name}.png`);
    await page.screenshot({ path: dest });
    console.log("saved", dest);
  }
  await browser.close();
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
