import { JSDOM } from "jsdom";

export function htmlToElement(html: string): Document {
    const jsdom = new JSDOM(html);
    return jsdom.window.document;
}

export function decodeHtml(html: string): string {
    return html
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}
