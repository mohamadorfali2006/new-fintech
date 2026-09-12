const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "showcase", "app");
const PAGES = [
  { name: "dashboard", url: "http://localhost:3000/dashboard" },
  { name: "analytics", url: "http://localhost:3000/analytics" },
  { name: "transactions", url: "http://localhost:3000/transactions" },
  { name: "budgets", url: "http://localhost:3000/budgets" },
];

function cookiesFromJar(jarPath) {
  const cookies = [];
  for (let line of fs.readFileSync(jarPath, "utf8").split("\n")) {
    if (!line || line.startsWith("# ")) continue;
    line = line.replace(/^#HttpOnly_/, "").trim();
    const p = line.trim().split("\t");
    if (p.length < 7) continue;
    cookies.push({
      name: p[5],
      value: p[6],
      domain: "localhost",
      path: "/",
    });
  }
  return cookies;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const cookies = cookiesFromJar(path.join(ROOT, "vjar.txt"));
  if (!cookies.some((c) => c.name === "authjs.session-token")) {
    throw new Error("no session cookie in vjar.txt — login first");
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  for (const p of PAGES) {
    await page.goto(p.url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    const dest = path.join(OUT, `${p.name}.png`);
    await page.screenshot({ path: dest, fullPage: true });
    console.log("saved", dest);
  }
  await browser.close();
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
