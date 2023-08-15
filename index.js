const puppeteer = require('puppeteer')
const md5 = require('md5');
const sharp = require('sharp');

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
        console.log(e);
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
        return (await resizeImage(Buffer.from(image.data))).toString('base64');
    } catch (e){
        console.log(e);
        return null;
    }

}

async function resizeImage(buffer){
    try{
        return await sharp(buffer)
        .resize(200)
        .toBuffer()
    } catch (e){
        console.log(e);
        return buffer;
    }
}


async function replaceImagesFromHtml(html){
    try {
        let link = html.match(/src=["']([^"']*)["']/)[1];
        const base64Image = await getImageCache(link);
        return html.replace(/src=["'][^"']*["']/, `src="data:image/png;base64, ${base64Image}"`);
    } catch (e){
        return html;
    }
}

app.post("/", async (req, res) => {
    let {header = '', footer = '', url = null, base64 = true} = req.body;
    if(!url) return res.status(422).json({message: "URL è necessário"});
    header = await replaceImagesFromHtml(header);
    footer = await replaceImagesFromHtml(footer);
    const pdf = await printPDF(url, header, footer);
    if(!pdf) {
        return res.status(500).json({error: "Servidor nativo caui"});
    }
    if(base64){
        const base64 = pdf.toString('base64');
        return res.send(base64);
    }
    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
    res.send(pdf)
});


app.listen(3001, () => console.log("running"));
