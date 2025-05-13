import * as cheerio from "cheerio";

import { IDescription, IProblem } from "../shared";

export function parseCodeforcesDescription(
    html: string,
    problem: IProblem,
): IDescription {
    const $ = cheerio.load(html);

    let body = "";
    const problemStatement = $(".problem-statement").first();

    if (problemStatement.length) {
        body = problemStatement.html()?.trim() ?? "";
        body = body.replace(
            /<pre>[\r\n]*([^]+?)[\r\n]*<\/pre>/g,
            "<pre><code>$1</code></pre>",
        );
    } else {
        console.log("No problem-statement div found.");
    }

    const timeLimit = $(".time-limit").first().contents().last().text().trim();
    const memoryLimit = $(".memory-limit")
        .first()
        .contents()
        .last()
        .text()
        .trim();

    return {
        title: `${problem.index}. ${problem.name}`,
        url: `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`,
        rating: problem.rating ? `${problem.rating}` : "UNKNOWN",
        tags: problem.tags,
        timeLimit,
        memoryLimit,
        body,
    };
}

export function parseCsesDescription(
    html: string,
    problem: IProblem,
): IDescription {
    const $ = cheerio.load(html);

    const problemStatement = $(".md").first();
    const constraintNode = $(".task-constraints").first();

    let timeLimit = "";
    let memoryLimit = "";

    if (constraintNode.length) {
        const children = constraintNode.children();
        timeLimit = children.eq(0).text().split(":")[1]?.trim() || "";
        memoryLimit = children.eq(1).text().split(":")[1]?.trim() || "";
    }

    let body = "";
    if (problemStatement.length) {
        body = problemStatement.html()?.trim() ?? "";
        body = body
            .replace(/<code>/g, '<span class="monospace">')
            .replace(/<\/code>/g, "</span>")
            .replace(/<h1([^>]*)>/g, '<div class="section-title"$1>')
            .replace(/<\/h1>/g, "</div>");
    } else {
        console.log("No .md element found.");
    }

    return {
        title: problem.name,
        url: `https://cses.fi/problemset/task/${problem.contestId}`,
        rating: "",
        tags: problem.tags,
        timeLimit,
        memoryLimit,
        body,
    };
}
