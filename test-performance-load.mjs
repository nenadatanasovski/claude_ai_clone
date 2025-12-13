import puppeteer from 'puppeteer';

async function testLoadPerformance() {
  console.log('Testing app load performance...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Clear cache
    await page.setCacheEnabled(false);

    // Set network throttling (Fast 3G)
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
      uploadThroughput: (750 * 1024) / 8, // 750 Kbps
      latency: 40 // 40ms RTT
    });

    console.log('Step 1: Cache cleared ✓');
    console.log('Step 2: Network throttling set to Fast 3G ✓');
    console.log('\nLoading app...\n');

    // Start timing
    const startTime = Date.now();

    // Navigate and wait for network idle
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    // Wait for interactive elements
    await page.waitForSelector('textarea[placeholder*="Message"]', { timeout: 5000 });
    await page.waitForSelector('button', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
        domInteractive: Math.round(perfData.domInteractive - perfData.fetchStart),
        loadComplete: Math.round(perfData.loadEventEnd - perfData.fetchStart),
        firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
        firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0)
      };
    });

    console.log('Step 3: Time to interactive measured ✓\n');
    console.log('=== PERFORMANCE METRICS ===');
    console.log(`Total Load Time: ${loadTime}ms (${(loadTime/1000).toFixed(2)}s)`);
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`DOM Interactive: ${metrics.domInteractive}ms`);
    console.log(`Load Complete: ${metrics.loadComplete}ms`);
    console.log(`First Paint: ${metrics.firstPaint}ms`);
    console.log(`First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    console.log('===========================\n');

    // Check if under 3 seconds
    const passesTest = loadTime < 3000;

    if (passesTest) {
      console.log(`Step 4: ✅ PASS - App loaded in ${(loadTime/1000).toFixed(2)}s (under 3 seconds)`);
    } else {
      console.log(`Step 4: ❌ FAIL - App loaded in ${(loadTime/1000).toFixed(2)}s (over 3 seconds)`);
    }

    // Check for loading indicators
    const hasLoaders = await page.evaluate(() => {
      const body = document.body.innerHTML;
      // Check for common loading patterns
      return body.includes('loading') || body.includes('skeleton') || body.includes('spinner');
    });

    console.log(`Step 5: Loading indicators present: ${hasLoaders ? '✓' : '(none needed - fast enough)'}\n`);

    // Take screenshot
    await page.screenshot({ path: 'logs/performance-load-test.png', fullPage: false });
    console.log('Screenshot saved to logs/performance-load-test.png');

    await browser.close();

    return passesTest;

  } catch (error) {
    console.error('Error during performance test:', error.message);
    await browser.close();
    return false;
  }
}

testLoadPerformance().then(passed => {
  process.exit(passed ? 0 : 1);
});
