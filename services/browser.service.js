const puppeteer = require("puppeteer");
module.exports = new class BrowserService {
  browser = null;
  page = null;
  headerTemplateAdjust = `<style>
  html {
    -webkit-print-color-adjust: exact;
    box-sizing: border-box;
  }
  
  *, ::after, ::before {
      box-sizing: border-box;
  }

  </style> `;

  async init(){
    if(!this.browser) {
      this.browser = await puppeteer.launch({headless: 'new'});
      console.log("navegador pronto");
    }
  }

  async getBrowser(){
    await this.init();
    return this.browser;
  }

  async getPDF(url, header, footer, waitForSelector){
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(10000);
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page
      .waitForSelector(waitForSelector, {visible: true, timeout: '3000'});
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      headerTemplate: this.headerTemplateAdjust + (header ?? ''),
      footerTemplate: footer ?? '',
      displayHeaderFooter: true,
      margin:{
        top: '0px'
      }
    });
  }
};
