import * as cheerio from "cheerio";

export function htmlToElement(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
}

export function decodeHtml(html: string): string {
    return html
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}
