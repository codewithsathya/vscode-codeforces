import { JSDOM } from 'jsdom';
import snarkdown from 'snarkdown';

export function htmlToElement(html: string): Document {
    const jsdom = new JSDOM(html);
    return jsdom.window.document;
}

export function markdownToHtml(markdown: string): string {
    return snarkdown(markdown);
}

export function decodeHtml(html: string): string {
    return html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
