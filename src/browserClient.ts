import type { Browser, Page } from "rebrowser-puppeteer-core";
import { connect } from "puppeteer-real-browser";
import { codeforcesChannel } from "./codeforcesChannel";
import { sleep } from "./utils/osUtils";
import { globalState } from "./globalState";

class BrowserClient {
    private browser: Browser | null = null;
    private page: Page | null = null;

    public async initialize() {
        const { browser, page } = await connect({
            headless: true,
            turnstile: true,
        });
        this.browser = browser;
        this.page = page;
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
        const cookies = globalState.getCookies();
        console.log(cookies);
        await this.browser.setCookie(...cookies);
        await this.page.goto("https://codeforces.com/enter?back=%2F");
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
    
        const rawHtmlPromise = new Promise<string>((resolve) => {
            this.page.on("response", async (response) => {
                if (response.url() === url && response.request().resourceType() === "document") {
                    resolve(await response.text());
                }
            });
        });
    
        await this.page.goto(url, { waitUntil: "domcontentloaded" });
    
        const rawHtml = await rawHtmlPromise;
    
        codeforcesChannel.appendLine(rawHtml);
        return rawHtml;
    }

    public async login(username: string, password: string) {
        await this.logout();
        const url = "https://codeforces.com/enter?back=%2Fprofile";

        if (!this.page) {
            throw new Error("not-initialized");
        }

        try {
            await this.page.goto(url, { waitUntil: "domcontentloaded" });

            await this.page.waitForSelector("#handleOrEmail", { timeout: 10000 });

            await this.page.type("#handleOrEmail", username);
            await this.page.type("#password", password);
            await this.page.click("#remember");
            await this.page.click("#enterForm .submit");

            codeforcesChannel.appendLine("Waiting for login confirmation...");

            await sleep(5000);

            // Wait for either the success or error condition
            const result = await Promise.race([
                this.page.waitForSelector(".personal-sidebar", { timeout: 25000 }).then(() => "success"),
                this.page.waitForSelector(".error", { timeout: 25000 }).then(() => "error")
            ]);

            if (result === "success") {
                const handle = await this.page.evaluate((sel) => {
                    const element = document.querySelector(sel);
                    return element.textContent;
                }, ".personal-sidebar > .for-avatar");
                const cookies = await this.browser.cookies();
                return { handle, cookies };
            } else {
                codeforcesChannel.appendLine("Invalid email or password.");
                throw new Error("invalid-credentials");
            }
        } catch (error) {
            throw new Error(`login-failed: ${error}`);
        }
    }

    public async logout() {
        const url = "https://codeforces.com";
        await this.page.goto(url, { waitUntil: "domcontentloaded" });
        const selector = "#header > div.lang-chooser > div:nth-child(2) > a:nth-child(2)";
        try {
            await this.page.waitForSelector(selector, { timeout: 25000 });

            const href = await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                const link = element ? element.getAttribute("href") : null;
                if (element.textContent.toLowerCase() === "logout") {
                    return link;
                } else {
                    return null;
                }
            }, selector);
            if (href === null) {
                return;
            }
            await this.page.goto(`https://codeforces.com/${href}`);
        } catch (error) {
            codeforcesChannel.appendLine(`Failed to logout: ${error}`);
        }
    }

    public async submitProblem(contestId: string, index: string, language: number, code: string) {
        await this.page.goto(`https://codeforces.com/contest/${contestId}/submit`);
        await this.page.waitForSelector("#sourceCodeTextarea", { timeout: 25000 });

        // Select language
        const languageSelector = 'select[name="programTypeId"]';
        await this.page.waitForSelector(languageSelector);
        await this.page.select(languageSelector, language.toString());

        const checkbox = await this.page.$("#toggleEditorCheckbox");
        const isChecked = await this.page.evaluate(el => (el as HTMLInputElement).checked, checkbox);

        if (!isChecked) {
            await checkbox.click();
        }

        await this.page.evaluate(() => {
            (document.querySelector("#sourceCodeTextarea") as HTMLTextAreaElement).value = "";
        });
        await this.page.type("#sourceCodeTextarea", code);

        // Select problem index
        const problemSelector = 'select[name="submittedProblemIndex"]';
        await this.page.waitForSelector(problemSelector);
        await this.page.select(problemSelector, index);

        // Submit the problem
        const submitButtonSelector = ".submit";
        await this.page.waitForSelector(submitButtonSelector);
        await this.page.click(submitButtonSelector);

        console.log(`Problem ${index} submitted successfully in contest ${contestId}.`);
    }
}

export const browserClient: BrowserClient = new BrowserClient();
