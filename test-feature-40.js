// Test Feature #40: Remove image before sending
// This script verifies the remove image functionality works

const puppeteer = require('puppeteer');

async function testFeature40() {
  console.log('Testing Feature #40: Remove image before sending\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForSelector('textarea[placeholder*="Message"]', { timeout: 5000 });

  console.log('✓ Page loaded');

  try {
    // Step 1: Upload an image
    console.log('\nStep 1: Uploading image...');
    const fileInput = await page.$('input[type="file"]');

    // Create a test image using page.evaluate
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#9333EA';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TEST IMAGE', 100, 100);

        canvas.toBlob(blob => {
          const file = new File([blob], 'test-image.png', { type: 'image/png' });
          const input = document.querySelector('input[type="file"]');
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          resolve();
        }, 'image/png');
      });
    });

    await page.waitForTimeout(1000);

    // Step 2: Verify image preview appears
    console.log('Step 2: Checking if image preview appears...');
    const imagePreview = await page.$('div.relative.group img');
    if (imagePreview) {
      console.log('✅ Image preview appears');
    } else {
      console.log('❌ Image preview not found');
      await browser.close();
      return;
    }

    // Step 3: Verify remove button exists
    console.log('Step 3: Checking if remove button exists...');
    const removeButton = await page.$('div.relative.group button');
    if (removeButton) {
      console.log('✅ Remove button exists');
    } else {
      console.log('❌ Remove button not found');
      await browser.close();
      return;
    }

    // Step 4: Click the remove button
    console.log('Step 4: Clicking remove button...');
    await page.evaluate(() => {
      const btn = document.querySelector('div.relative.group button');
      btn.click();
    });

    await page.waitForTimeout(500);

    // Step 5: Verify image is removed
    console.log('Step 5: Verifying image is removed...');
    const imageAfterRemove = await page.$('div.relative.group img');
    if (!imageAfterRemove) {
      console.log('✅ Image successfully removed from input area');
      console.log('\n🎉 Feature #40: All tests PASSED!');
    } else {
      console.log('❌ Image still appears after clicking remove');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

testFeature40().catch(console.error);
