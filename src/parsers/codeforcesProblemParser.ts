import { load as loadCheerio } from "cheerio";
import cheerio from "cheerio";

import { codeforcesChannel } from "../codeforcesChannel";
import { Problem } from "../cph/types";
import { decodeHtml } from "../utils/domUtils";

import { TaskBuilder } from "./taskBuilder";

export class CodeforcesProblemParser {
    public async parse(url: string, html: string): Promise<Problem> {
        const task = new TaskBuilder("Codeforces").setUrl(url);
        const $ = loadCheerio(html);

        codeforcesChannel.appendLine("Parsing main problem");
        this.parseMainProblem($, url, task);

        return task.build();
    }

    private parseMainProblem(
        $: cheerio.CheerioAPI,
        url: string,
        task: TaskBuilder,
    ): void {
        try {
            const title = $(".problem-statement > .header > .title")
                .text()
                .trim();
            if (title) {
                task.setName(title);
            }

            if (url.includes("/edu/")) {
                const breadcrumbs = $(".eduBreadcrumb > a")
                    .toArray()
                    .map((el) => $(el).text().trim());
                breadcrumbs.pop();
                task.setCategory(breadcrumbs.join(" - "));
            } else {
                const contestType = url.includes("/gym/") ? "gym" : "contest";
                const catElem = $(
                    `.rtable > tbody > tr > th > a[href*=${contestType}]`,
                );
                if (catElem.length) {
                    task.setCategory(catElem.text().trim());
                }
            }

            const interactiveKeywords = [
                "Interaction",
                "Протокол взаимодействия",
            ];
            const isInteractive = $(".section-title")
                .toArray()
                .some((el) => interactiveKeywords.includes($(el).text()));
            task.setInteractive(isInteractive);

            const timeLimitStr = $(".problem-statement > .header > .time-limit")
                .text()
                .split(" ")
                .find((t) => parseFloat(t));
            task.setTimeLimit(parseFloat(timeLimitStr ?? "3") * 1000);

            const memoryLimitStr = $(
                ".problem-statement > .header > .memory-limit",
            )
                .text()
                .split(" ")
                .find((t) => parseInt(t));
            task.setMemoryLimit(parseInt(memoryLimitStr ?? "0", 10));

            const inputFile = $(".problem-statement > .header > .input-file")
                .text()
                .trim();
            if (
                !["stdin", "standard input", "стандартный ввод"].includes(
                    inputFile,
                )
            ) {
                task.setInput({ fileName: inputFile, type: "file" });
            }

            const outputFile = $(".problem-statement > .header > .output-file")
                .text()
                .trim();
            if (
                !["stdout", "standard output", "стандартный вывод"].includes(
                    outputFile,
                )
            ) {
                task.setOutput({ fileName: outputFile, type: "file" });
            }

            const inputs = $(".input pre");
            const outputs = $(".output pre");

            for (let i = 0; i < inputs.length && i < outputs.length; i++) {
                task.addTest(
                    this.parseMainTestBlock($, $(inputs[i])),
                    this.parseMainTestBlock($, $(outputs[i])),
                );
            }
        } catch (error) {
            codeforcesChannel.appendLine(
                `Error occurred at parsing problem: ${error}`,
            );
        }
    }

    private parseMainTestBlock(
        $: cheerio.CheerioAPI,
        block: cheerio.Cheerio<any>,
    ): string {
        const lines = block
            .find(".test-example-line")
            .toArray()
            .filter((el) => $(el).find(".test-example-line, br").length === 0);

        if (lines.length === 0) {
            return decodeHtml(block.html() || "");
        }

        return lines.map((el) => decodeHtml($(el).html() || "")).join("\n");
    }
}

export const codeforcesProblemParser = new CodeforcesProblemParser();
