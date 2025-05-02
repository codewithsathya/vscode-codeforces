import type { Browser, Page } from "rebrowser-puppeteer-core";
import { connect } from "puppeteer-real-browser";
import { codeforcesChannel } from "./codeforcesChannel";
import { sleep } from "./utils/osUtils";
import { globalState } from "./globalState";
import { getContestUrl } from "./utils/urlUtils";
import { IProblem, ProblemState } from "./shared";
import { shouldShowBrowser } from "./utils/settingUtils";

class BrowserClient {
    private browser: Browser | null = null;
    private page: Page | null = null;

    public async initialize() {
        const showBrowser = shouldShowBrowser();
        const { browser, page } = await connect({
            headless: !showBrowser,
            turnstile: true,
            args: ["--start-maximized"],
        });
        this.browser = browser;
        this.page = page;
        await this.page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        );
        const cookies = globalState.getCookies();
        await this.browser.setCookie(...cookies);
        console.log("Cookies set:", cookies);
        await this.page.goto("https://codeforces.com/enter?back=%2F", { waitUntil: "networkidle2" });

        let finalizeClicked = false;
        for (let i = 0; i < 100 && !finalizeClicked; i++) {
            try {
                await this.page.waitForSelector("#finalize-button", { timeout: 10000 });
                await this.page.click("#finalize-button");
                finalizeClicked = true;
                console.log("Clicked finalize button");
            } catch (err) {
                console.log(`Attempt ${i + 1}: #finalize-button not found yet`);
            }
        }
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
                if (
                    response.url() === url &&
                    response.request().resourceType() === "document"
                ) {
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
            await this.page.goto(url, { waitUntil: "networkidle2" });

            await this.page.waitForSelector("#handleOrEmail", {
                timeout: 30000,
            });

            await this.page.type("#handleOrEmail", username);
            await this.page.type("#password", password);
            await this.page.click("#remember");
            await this.page.click("#enterForm .submit");

            codeforcesChannel.appendLine("Waiting for login confirmation...");

            await sleep(5000);

            // Wait for either the success or error condition
            const result = await Promise.race([
                this.page
                    .waitForSelector(".personal-sidebar", { timeout: 25000 })
                    .then(() => "success"),
                this.page
                    .waitForSelector(".error", { timeout: 25000 })
                    .then(() => "error"),
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
        const selector =
            "#header > div.lang-chooser > div:nth-child(2) > a:nth-child(2)";
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

    public async getContestProblems(contestId: number): Promise<IProblem[]> {
        try {
            if (!this.page) {
                throw new Error("not-initialized");
            }
            const url = getContestUrl(contestId);
            await this.page.goto(url, { waitUntil: "domcontentloaded" });
            await this.page.waitForSelector("table.problems", {
                timeout: 20000,
            });

            const problems: IProblem[] = await this.page.evaluate(
                (contestId, problemState) => {
                    let rows = Array.from(
                        document.querySelectorAll("table.problems tbody tr"),
                    );
                    rows = rows.slice(1);
                    return rows.map((row) => {
                        const idElement = row.querySelector("td.left a");
                        const nameElement = row.querySelector("td div a");
                        const solvedCountElement =
                            row.querySelector("td.right a");

                        const index = idElement?.textContent?.trim() ?? "";
                        const name = nameElement?.textContent?.trim() ?? "";
                        const solvedCountText =
                            solvedCountElement?.textContent
                                ?.trim()
                                .replace(/\D/g, "") ?? "0";
                        const solvedCount = parseInt(solvedCountText, 10);
                        const tags: string[] = [];
                        const problem = {
                            id: `${contestId}:${index}`,
                            contestId,
                            index,
                            name,
                            state: problemState.UNKNOWN,
                            tags,
                            solvedCount,
                        };
                        return problem;
                    });
                },
                contestId,
                ProblemState,
            );
            codeforcesChannel.appendLine(
                `Collected running problems for contest ${contestId}: ${problems.length}`,
            );
            return problems;
        } catch (error) {
            codeforcesChannel.appendLine(
                `Failed to get running problems: ${error}`,
            );
        }
    }
}

export const browserClient: BrowserClient = new BrowserClient();
