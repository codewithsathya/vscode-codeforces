import { JSDOM } from "jsdom";
import { IDescription, IProblem } from "../shared";

export function parseCodeforcesDescription(html: string, problem: IProblem): IDescription {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let problemStatement = document.querySelector(".problem-statement");
    let body: string = "";
    if (problemStatement) {
        body = problemStatement.innerHTML.trim();
        body = body.replace(
            /<pre>[\r\n]*([^]+?)[\r\n]*<\/pre>/g,
            "<pre><code>$1</code></pre>",
        );
    } else {
        console.log("No problem-statement div found.");
    }
    let timeLimitDiv = document.querySelector(".time-limit");
    let memoryLimitDiv = document.querySelector(".memory-limit");
    let timeLimit: string = "";
    let memoryLimit: string = "";
    if (timeLimitDiv) {
        const lastChild = timeLimitDiv.lastChild;
        if (lastChild) {
            timeLimit = lastChild.textContent.trim();
        }
    }
    if (memoryLimitDiv) {
        const lastChild = memoryLimitDiv.lastChild;
        if (lastChild) {
            memoryLimit = lastChild.textContent.trim();
        }
    }

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

export function parseCsesDescription(html: string, problem: IProblem): IDescription {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let problemStatement = document.querySelector(".md");
    const constraintNode = document.querySelector(".task-constraints");
    let timeLimit: string = "";
    let memoryLimit: string = "";
    if (constraintNode) {
        timeLimit = constraintNode.children[0].textContent.split(":")[1].trim();
        memoryLimit = constraintNode.children[1].textContent.split(":")[1].trim();
    }
    let body: string = "";
    if (problemStatement) {
        body = problemStatement.innerHTML.trim();
        body = body.replace(/<code>/g, '<span class="monospace">')
            .replace(/<\/code>/g, '</span>')
            .replace(/<h1([^>]*)>/g, '<div class="section-title"$1>')
            .replace(/<\/h1>/g, '</div>');
    } else {
        console.log("No problem-statement div found.");
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