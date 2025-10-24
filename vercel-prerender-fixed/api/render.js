const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

function extractTarget(req) {
  const q = req.query || {};
  if (q.u) return decodeURIComponent(q.u);
  if (q.url) return q.url;
  const m = req.url && req.url.match(/\/api\/render\/(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

module.exports = async (req, res) => {
  try {
    const target = extractTarget(req);
    if (!target) return res.status(400).json({ error: 'Missing ?url= or /render/<encoded>' });
    if (!/^https?:\/\//i.test(target)) return res.status(400).json({ error: 'URL must start with http(s)://' });

    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; SCFE-Prerender/1.0; +https://vercel.com)');
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(1500);

    const content = await page.content();
    await browser.close();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Render error', detail: String((err && err.message) || err) });
  }
};