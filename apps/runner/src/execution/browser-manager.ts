import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  browser ??= await chromium.launch({ headless: true });
  return browser;
}

export async function createRunPage(): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const activeBrowser = await getBrowser();
  const context = await activeBrowser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();

  return { context, page };
}

export async function closeRunnerBrowser(): Promise<void> {
  if (!browser) {
    return;
  }

  await browser.close();
  browser = null;
}
