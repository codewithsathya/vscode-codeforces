import { codeforcesChannel } from "./codeforcesChannel";
import { getContestUrl } from "./utils/urlUtils";
import { IProblem, ProblemState } from "./shared";
import { shouldShowBrowser } from "./utils/settingUtils";
import { Browser, Page } from "puppeteer";

import puppeteer from "puppeteer-extra";

import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());;

class BrowserClient {
    private browser: Browser | null = null;
    private page: Page | null = null;

    public async initialize() {
        const showBrowser = shouldShowBrowser();

        this.browser = await puppeteer.launch({
            headless: !showBrowser,
        });
        this.page = (await this.browser.pages())[0];

        await this.page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        );
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
                            isFavorite: false,
                            id: `${contestId}:${index}`,
                            contestId,
                            index,
                            name,
                            state: problemState.UNKNOWN,
                            tags,
                            solvedCount,
                            platform: "codeforces"
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
