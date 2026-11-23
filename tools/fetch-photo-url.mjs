// 通过浏览器打开 Unsplash 页面，取出 og:image 原图地址
import path from 'node:path';
import { createRequire } from 'node:module';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const urls = [
  'https://unsplash.com/photos/m_8q6yTvO2U',
  'https://unsplash.com/photos/6AJzcG6dcc4',
  'https://unsplash.com/photos/q374uGto2y4',
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

for (const u of urls) {
  try {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    const meta = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:image"]');
      const tw = document.querySelector('meta[name="twitter:image"]');
      return { og: og && og.content, tw: tw && tw.content, title: document.title };
    });
    console.log(JSON.stringify({ u, ...meta }));
  } catch (e) {
    console.log(JSON.stringify({ u, error: String(e && e.message).slice(0, 120) }));
  }
}

await browser.close();
