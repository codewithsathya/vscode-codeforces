import { codeforcesChannel } from "../codeforcesChannel";
import { Problem } from "../cph/types";
import { decodeHtml, htmlToElement } from "../utils/domUtils";
import { TaskBuilder } from "./taskBuilder";

export class CodeforcesProblemParser {
    public async parse(url: string, html: string): Promise<Problem> {
        const task = new TaskBuilder("Codeforces").setUrl(url);

        if (url.includes("/problemsets/acmsguru")) {
            const elem = htmlToElement(html);
            const table = elem.querySelector(
                ".problemindexholder > .ttypography > table",
            );

            if (table) {
                this.parseAcmSguRuProblemInsideTable(html, task);
            } else {
                this.parseAcmSguRuProblemNotInsideTable(html, task);
            }
        } else {
            codeforcesChannel.appendLine("Parsing main problem");
            this.parseMainProblem(html, url, task);
        }

        return task.build();
    }

    private parseMainProblem(
        html: string,
        url: string,
        task: TaskBuilder,
    ): void {
        try {
            const elem = htmlToElement(html);

            const titleElement = elem.querySelector(
                ".problem-statement > .header > .title",
            );
            if (titleElement && titleElement.textContent) {
                task.setName(titleElement.textContent.trim());
            }
            codeforcesChannel.appendLine("Name set done");

            if (url.includes("/edu/")) {
                const breadcrumbs = [
                    ...elem.querySelectorAll(".eduBreadcrumb > a"),
                ].map((el) => el.textContent.trim());
                breadcrumbs.pop();
                task.setCategory(breadcrumbs.join(" - "));
            } else {
                const contestType = url.includes("/gym/") ? "gym" : "contest";
                const titleElem = elem.querySelector(
                    `.rtable > tbody > tr > th > a[href*=${contestType}]`,
                );

                if (titleElem !== null) {
                    task.setCategory(titleElem.textContent.trim());
                }
            }
            codeforcesChannel.appendLine("Category set done");

            const interactiveKeywords = [
                "Interaction",
                "Протокол взаимодействия",
            ];
            const isInteractive = [
                ...elem.querySelectorAll(".section-title"),
            ].some((el) => interactiveKeywords.indexOf(el.textContent) > -1);

            task.setInteractive(isInteractive);
            codeforcesChannel.appendLine("Interactive set done");

            const timeLimitNode = this.getLastTextNode(
                elem,
                ".problem-statement > .header > .time-limit",
            );
            const timeLimitStr = timeLimitNode?.textContent?.split(" ")[0];
            task.setTimeLimit(parseFloat(timeLimitStr ?? "3") * 1000);
            codeforcesChannel.appendLine("Time limit set done");

            const memoryLimitNode = this.getLastTextNode(
                elem,
                ".problem-statement > .header > .memory-limit",
            );
            const memoryLimitStr =
                memoryLimitNode?.textContent?.split(" ")[0] || "0";
            task.setMemoryLimit(parseInt(memoryLimitStr, 10));
            codeforcesChannel.appendLine("Memory limit set done");

            const inputFile = this.getLastTextNode(
                elem,
                ".problem-statement > .header > .input-file",
            ).textContent;
            if (
                inputFile !== "stdin" &&
                inputFile !== "standard input" &&
                inputFile !== "стандартный ввод"
            ) {
                task.setInput({
                    fileName: inputFile,
                    type: "file",
                });
            }
            codeforcesChannel.appendLine("Input set done");

            const outputFile = this.getLastTextNode(
                elem,
                ".problem-statement > .header > .output-file",
            ).textContent;
            if (
                outputFile !== "stdout" &&
                outputFile !== "standard output" &&
                outputFile !== "стандартный вывод"
            ) {
                task.setOutput({
                    fileName: outputFile,
                    type: "file",
                });
            }
            codeforcesChannel.appendLine("Output set done");

            const inputs = elem.querySelectorAll(".input pre");
            const outputs = elem.querySelectorAll(".output pre");

            for (let i = 0; i < inputs.length && i < outputs.length; i++) {
                task.addTest(
                    this.parseMainTestBlock(inputs[i]),
                    this.parseMainTestBlock(outputs[i]),
                );
            }
            codeforcesChannel.appendLine("Added tests");
        } catch (error) {
            codeforcesChannel.appendLine(
                `Error occurred at parsing problem: ${error}`,
            );
        }
    }

    private parseMainTestBlock(block: Element): string {
        const lines = [...block.querySelectorAll(".test-example-line")].filter(
            (el) => el.querySelector(".test-example-line, br") === null,
        );

        if (lines.length === 0) {
            return decodeHtml(block.innerHTML);
        }

        return [...lines].map((el) => decodeHtml(el.innerHTML)).join("\n");
    }

    private parseAcmSguRuProblemInsideTable(
        html: string,
        task: TaskBuilder,
    ): void {
        const elem = htmlToElement(html);

        task.setName(
            elem.querySelector(".problemindexholder h3").textContent.trim(),
        );
        task.setCategory("acm.sgu.ru archive");

        const timeLimitMatch = /time limit per test: ([0-9.]+)\s+sec/.exec(
            html,
        );
        if (timeLimitMatch) {
            task.setTimeLimit(parseFloat(timeLimitMatch[1]) * 1000);
        }
        const memoryLimitMatch = /memory\s+limit per test:\s+(\d+)\s+KB/.exec(
            html,
        );
        if (memoryLimitMatch) {
            task.setMemoryLimit(parseInt(memoryLimitMatch[1], 10) / 1000);
        }

        const blocks = elem.querySelectorAll("font > pre");
        for (let i = 0; i < blocks.length - 1; i += 2) {
            task.addTest(
                blocks[i].textContent as string,
                blocks[i + 1].textContent as string,
            );
        }
    }

    private parseAcmSguRuProblemNotInsideTable(
        html: string,
        task: TaskBuilder,
    ): void {
        const elem = htmlToElement(html);

        task.setName(
            elem.querySelector(".problemindexholder h4").textContent.trim(),
        );
        task.setCategory("acm.sgu.ru archive");

        const timeLimitMatch = /Time\s+limit per test: ([0-9.]+)\s+sec/i.exec(
            html,
        );
        if (timeLimitMatch) {
            task.setTimeLimit(parseFloat(timeLimitMatch[1]) * 1000);
        }
        const memoryLimitMatch =
            /Memory\s+limit(?: per test)*: (\d+)\s+(?:kilobytes|KB)/i.exec(
                html,
            );
        if (memoryLimitMatch) {
            task.setMemoryLimit(parseInt(memoryLimitMatch[1], 10) / 1000);
        }

        elem.querySelectorAll("table").forEach((table: Element) => {
            const blocks = table.querySelectorAll("pre");
            if (blocks.length === 4) {
                task.addTest(
                    blocks[2].textContent as string,
                    blocks[3].textContent as string,
                );
            }
        });
    }

    public parseContestRow(elem: Element, task: TaskBuilder): void {
        const columns = elem.querySelectorAll("td");

        task.setUrl(columns[0].querySelector("a").href);

        const letter = columns[0].querySelector("a").text.trim();
        const name = columns[1].querySelector("a").text.trim();

        task.setName(`${letter}. ${name}`);

        const detailsStr = columns[1].querySelector(
            "div > div:not(:first-child)",
        ).textContent;
        const detailsMatches = /([^/]+)\/([^\n]+)\s+(\d+) s,\s+(\d+) MB/.exec(
            detailsStr.replace("\n", " "),
        );

        const inputFile = detailsMatches[1].trim();
        const outputFile = detailsMatches[2].trim();
        const timeLimit = parseInt(detailsMatches[3].trim()) * 1000;
        const memoryLimit = parseInt(detailsMatches[4].trim());

        if (inputFile.includes(".")) {
            task.setInput({
                fileName: inputFile,
                type: "file",
            });
        }

        if (outputFile.includes(".")) {
            task.setOutput({
                fileName: outputFile,
                type: "file",
            });
        }

        task.setTimeLimit(timeLimit);
        task.setMemoryLimit(memoryLimit);
    }

    private getLastTextNode(elem: Document, selector: string): ChildNode {
        let selectedNode = elem.querySelector(selector);

        const styledNode = selectedNode.querySelector(
            ".tex-font-style-sl, .tex-font-style-bf",
        );
        if (styledNode !== null) {
            selectedNode = styledNode;
        }

        const textNodes = [...selectedNode.childNodes].filter(
            (node) => node.nodeType === 3,
        );
        return textNodes[textNodes.length - 1];
    }
}

export const codeforcesProblemParser = new CodeforcesProblemParser();
