const puppeteer = require('puppeteer')
const md5 = require('md5');

const fs = require("fs")
const express = require("express");
const app = express()
const cors = require("cors");
const axios = require('axios');
const browserService = require('./services/browser.service')
app.use(express.json())
app.use(cors());

browserService.init();
async function printPDF(url, header = null, footer = null) {
    try{
        return await browserService.getPDF(url, header, footer, '.body');
    } catch (e){
        print(e);
        return null;
    }
}

async function getImageCache(url){
    const md5Url = await md5(url);
    const path = `${__dirname}/img-cache/${md5Url}`;
    if (fs.existsSync(path)) {
        return fs.readFileSync(path, 'utf8');
    }
    return await setImageCache(url);
}

async function setImageCache(url){
    const md5Url = await md5(url);
    const path = `${__dirname}/img-cache/${md5Url}`;
    const base64 = await getImgBase64(url);
    if(!base64) return null;
    fs.writeFileSync(path, base64);
    return base64;
}

async function getImgBase64(url){
    try{
        let image = await axios.get(url, {responseType: 'arraybuffer'});
        return Buffer.from(image.data).toString('base64');
    } catch (e){
        print(e);
        return null;
    }
}
async function replaceImagesFromHtml(html){
    let link = html.match(/src=["']([^"']*)["']/)[1];
    const base64Image = await getImageCache(link);
    return html.replace(/src=["'][^"']*["']/, `src="data:image/png;base64, ${base64Image}"`);
}

app.post("/", async (req, res) => {
    let {header = '', footer = '', url = null, base64 = true} = req.body;
    if(!url) return res.status(422).json({message: "URL è necessário"});
    header = replaceImagesFromHtml(header);
    footer = replaceImagesFromHtml(footer);
    const pdf = await printPDF(url, header, footer);
    if(!pdf) {
        return res.status(500).json({error: "Servidor nativo caui"});
    }
    if(base64){
        const base64 = buffer.toString('base64');
        return res.send(base64);
    }
    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
    res.send(pdf)
});


app.listen(3001, () => console.log("running"));
