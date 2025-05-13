import { Problem } from "../cph/types";
import { htmlToElement } from "../utils/domUtils";

import { TaskBuilder } from "./taskBuilder";

export class CSESProblemParser {
    public async parse(url: string, html: string): Promise<Problem> {
        const $ = htmlToElement(html);
        const task = new TaskBuilder("CSES").setUrl(url);

        task.setName($(".title-block > h1").text().trim());
        task.setCategory($(".title-block > h3 > a").text().trim());

        const limitsStr = $(".task-constraints").text();
        const timeMatch = /([0-9.]+) s/.exec(limitsStr);
        const memoryMatch = /(\d+) MB/.exec(limitsStr);

        if (timeMatch) {
            task.setTimeLimit(parseFloat(timeMatch[1]) * 1000);
        }
        if (memoryMatch) {
            task.setMemoryLimit(parseInt(memoryMatch[1], 10));
        }

        // Find test cases
        const codeBlocks: string[] = [];
        $("[id^=example], .content pre").each((_, el) => {
            const id = $(el).attr("id");
            if (id?.startsWith("example")) {
                // Skip headers like <h3 id="example1">Example 1</h3>
                return;
            }
            codeBlocks.push($(el).text().trim());
        });

        for (let i = 0; i < codeBlocks.length - 1; i += 2) {
            task.addTest(codeBlocks[i], codeBlocks[i + 1]);
        }

        return task.build();
    }
}

export const csesProblemParser = new CSESProblemParser();
