import { codeforcesChannel } from "./codeforcesChannel";
import { getContestUrl } from "./utils/urlUtils";
import { IProblem, ProblemState } from "./shared";
import { Browser, Page } from "puppeteer";
import { install, Browser as BrowserOptions, getInstalledBrowsers, InstalledBrowser, resolveBuildId, detectBrowserPlatform, BrowserTag, BrowserPlatform } from "@puppeteer/browsers";
import path from "path";
import * as vscode from "vscode";

import puppeteer from "puppeteer-extra";

import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { globalState } from "./globalState";
puppeteer.use(StealthPlugin());;

class BrowserClient {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private browserExecutablePath: string | null = null;
    private cacheDir: string;

    private async downloadBrowser(): Promise<InstalledBrowser> {
        const browser = BrowserOptions.CHROMIUM
        const platform = detectBrowserPlatform();
        const buildId = await resolveBuildId(browser, platform, BrowserTag.LATEST);
        let installedBrowser: InstalledBrowser;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Setting up browser",
            cancellable: false,
        }, async (progress) => {
            let prev = 0;
            progress.report({ message: "Downloading browser..." });
            installedBrowser = await install({
                cacheDir: this.cacheDir,
                browser,
                buildId,
                platform,
                downloadProgressCallback: (downloaded: number, total: number) => {
                    progress.report({ message: `Downloading browser ${100 * (downloaded / total)} %`, increment: 100 * (downloaded / total) - prev })
                    prev = (downloaded / total) * 100;
                }
            });
        });
        return installedBrowser;
    }

    private async downloadBrowserIfNeeded() {
        const browsers = await getInstalledBrowsers({
            cacheDir: this.cacheDir,
        })
        let installedBrowser: InstalledBrowser;
        if (!browsers || browsers.length === 0) {
            installedBrowser = await this.downloadBrowser();
        } else {
            installedBrowser = browsers[0];
        }
        this.browserExecutablePath = installedBrowser.executablePath;
    }

    public async initialize() {
        this.cacheDir = path.join(globalState.getGlobalStoragePath(), "browsers");
        await this.downloadBrowserIfNeeded();
        this.browser = await puppeteer.launch({
            executablePath: this.browserExecutablePath,
            enableExtensions: false,
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu",
                "--no-zygote",
                "--single-process",
                "--disable-features=site-per-process",
            ],
        });
        this.page = (await this.browser.pages())[0];

        await this.page.setRequestInterception(true);
        this.page.on("request", (req) => {
            const resourceType = req.resourceType();
            if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

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

    public async getData(url: string, retries = 1): Promise<string> {
        if (!this.page) {
            throw new Error("not-initialized");
        }

        try {
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
            return rawHtml;
        } catch (error) {
            codeforcesChannel.appendLine(`Error fetching HTML from ${url}: ${error}`);

            if (retries > 0) {
                codeforcesChannel.appendLine(`Retrying... (${retries} retries left)`);
                await this.initialize();
                return this.getData(url, retries - 1);
            } else {
                throw error;
            }
        }
    }

    public async getContestProblems(contestId: number, retries = 1): Promise<IProblem[]> {
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
                `Error fetching problems for contest ${contestId}: ${error}`
            );

            if (retries > 0) {
                codeforcesChannel.appendLine(`Retrying... (${retries} retries left)`);
                await this.initialize();
                return await this.getContestProblems(contestId, retries - 1);
            } else {
                throw error;
            }
        }
    }
}

export const browserClient: BrowserClient = new BrowserClient();
