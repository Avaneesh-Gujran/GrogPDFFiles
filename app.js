const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (ws) => {
  console.log('WebSocket connection established');

  ws.on('message', async (message) => {
    const messageObj = JSON.parse(message);

    if (messageObj.type === 'render') {
      const htmlFile = messageObj.formData.htmlFile;
      const cssFile = messageObj.formData.cssFile;

      const htmlFilePath = path.join(__dirname, 'uploads', htmlFile.name);
      const cssFilePath = path.join(__dirname, 'uploads', cssFile.name);

      fs.writeFileSync(htmlFilePath, htmlFile.data);
      fs.writeFileSync(cssFilePath, cssFile.data);

      try {
        const previewUrl = await renderHTMLToPDF(htmlFilePath, cssFilePath);
        const response = {
          type: 'preview',
          url: previewUrl
        };
        ws.send(JSON.stringify(response));
      } catch (error) {
        console.error('Error:', error);
        ws.send(JSON.stringify({ error: 'Error rendering PDF.' }));
      } finally {
        fs.unlinkSync(htmlFilePath);
        fs.unlinkSync(cssFilePath);
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

async function renderHTMLToPDF(htmlFilePath, cssFilePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
  const cssContent = fs.readFileSync(cssFilePath, 'utf8');

  await page.setContent(`<style>${cssContent}</style>${htmlContent}`, { waitUntil: 'networkidle0' });

  const previewFilePath = path.join(__dirname, 'preview.pdf');
  await page.pdf({ path: previewFilePath, format: 'A4' });

  await browser.close();

  return `/download-preview?filePath=${encodeURIComponent(previewFilePath)}`;
}
