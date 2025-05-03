import { browserClient } from "./browserClient";

class CsesExecutor {
    async getProblem(id: number): Promise<string> {
        const html = await browserClient.getData(
            `https://www.cses.fi/problemset/task/${id}`
        );
        if (!html || html === "") {
            throw new Error("Failed to get problem");
        }
        return html;
    }
}

export const csesExecutor: CsesExecutor = new CsesExecutor();