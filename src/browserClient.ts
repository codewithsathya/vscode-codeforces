import type { Browser, Page } from "rebrowser-puppeteer-core";
import { connect } from "puppeteer-real-browser";
import { codeforcesChannel } from "./codeforcesChannel";
import { sleep } from "./utils/osUtils";
import { globalState } from "./globalState";
import { DialogType, promptForOpenOutputChannel } from "./utils/uiUtils";
import { getMyContestSubmissionsUrl } from "./utils/urlUtils";
import { Status } from "./cph/types";

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

    public async submitProblem(contestId: string, index: string, language: number, code: string, callback: (verdict: Status) => void = () => { }) {
        try {
            await this.page.goto(`https://codeforces.com/contest/${contestId}/submit`);
            await this.page.waitForSelector("#sourceCodeTextarea", { timeout: 25000 });

            const languageSelector = 'select[name="programTypeId"]';
            await this.page.waitForSelector(languageSelector);
            await this.page.select(languageSelector, language.toString());

            const checkbox = await this.page.$("#toggleEditorCheckbox");
            const isChecked = await this.page.evaluate(el => (el as HTMLInputElement).checked, checkbox);

            if (!isChecked) {
                await checkbox.click();
            }

            const problemSelector = 'select[name="submittedProblemIndex"]';
            await this.page.waitForSelector(problemSelector);
            await this.page.select(problemSelector, index);

            await this.page.evaluate(() => {
                (document.querySelector("#sourceCodeTextarea") as HTMLTextAreaElement).value = "";
            });
            await this.page.type("#sourceCodeTextarea", code);

            const submitButtonSelector = ".submit";

            let submitSuccess = false;
            for (let i = 0; i < 3; i++) {
                await this.page.click(submitButtonSelector);

                const navigationPromise = this.waitForSuccessfulSubmission(contestId);
                const errorMessagePromise = this.page.waitForSelector("span.error.for__source", { timeout: 5000 }).catch(() => { });

                const result = await Promise.race([navigationPromise, errorMessagePromise]);

                if (result) {
                    if (await this.page.$("span.error.for__source")) {
                        throw new Error("duplicate-submission");
                    }
                    submitSuccess = true;
                    break;
                }

                await sleep(2000);
            }

            if (!submitSuccess) {
                throw new Error("Failed to submit problem after multiple attempts");
            }

            promptForOpenOutputChannel("Submitted successfully", DialogType.completed);
            this.trackVerdict(callback);
        } catch (error) {
            const err = error as Error;
            codeforcesChannel.appendLine(`Error submitting problem using browser :${error}`);
            if (err.message === "duplicate-submission") {
                promptForOpenOutputChannel("You have submitted exactly the same code before", DialogType.error);
                return;
            }

        }
    }

    private async waitForSuccessfulSubmission(contestId: string) {
        const mySubmissionsUrl = getMyContestSubmissionsUrl(contestId);
        for (let i = 0; i < 5; i++) {
            await sleep(1000);
            if (this.page.url() === mySubmissionsUrl) {
                return true;
            }
        }
        return false;
    }

    private async trackVerdict(callback: (verdict: Status) => void) {
        if (!this.page) {
            throw new Error("Browser page not initialized");
        }

        const verdictSelector = `.status-cell`;

        await this.page.waitForSelector(verdictSelector, { timeout: 5000 });
        while (true) {
            try {
                const verdict = await this.page.evaluate((selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : null;
                }, verdictSelector);
                codeforcesChannel.appendLine("Collected verdict");

                const timeConsumed = await this.page.evaluate((selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : "";
                }, ".time-consumed-cell");
                codeforcesChannel.appendLine("Collected time consumed");

                const memoryConsumed = await this.page.evaluate((selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : "";
                }, ".memory-consumed-cell");
                codeforcesChannel.appendLine("Collected memory consumed");

                if (verdict) {
                    codeforcesChannel.appendLine(`Verdict: ${verdict}`);
                    callback({ verdict, time: timeConsumed, memory: memoryConsumed });
                }

                if (verdict && !verdict.includes("Running") && !verdict.includes("Queue")) {
                    break;
                }
                await sleep(500);
            } catch (error) {
                codeforcesChannel.appendLine(`Error tracking verdict: ${error}`);
                break;
            }
        }
    }

}

export const browserClient: BrowserClient = new BrowserClient();
