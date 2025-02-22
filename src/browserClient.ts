import { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

class BrowserClient {
    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor() {
        puppeteer.use(StealthPlugin());
    }

    public async initialize() {
        this.browser = await puppeteer.launch({
            headless: "shell",
            args: ["--no-sandbox"],
        });
        this.page = await this.browser.newPage();
    }

    public close() {
        if (this.page) {
            this.page.close();
            this.page = null;
        }
        if (this.browser) {
            this.browser.close();
            this.browser = null;
        }
    }

    public async getData(url: string) {
        if (!this.page) {
            throw new Error("not-initialized");
        }
        await this.page.goto(url, { waitUntil: "domcontentloaded" });
        return await this.page.content();
    }
}

export const browserClient: BrowserClient = new BrowserClient();
