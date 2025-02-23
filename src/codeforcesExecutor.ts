import { browserClient } from "./browserClient";

class CodeforcesExecutor {
    async getProblem(contestId: number, index: string): Promise<string> {
        const html = await browserClient.getData(`https://codeforces.com/contest/${contestId}/problem/${index}`);
        if(!html || html === "") {
            throw new Error("Failed to get problem");
        }
        return html;
    }
}

export const codeforcesExecutor: CodeforcesExecutor = new CodeforcesExecutor();