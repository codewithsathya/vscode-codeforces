import { browserClient } from "./browserClient";
import { codeforcesChannel } from "./codeforcesChannel";
import { DialogType, promptForOpenOutputChannel } from "./utils/uiUtils";

class CodeforcesExecutor {
    async getProblem(contestId: number, index: string): Promise<string> {
        try {
            const html = await browserClient.getData(
                `https://codeforces.com/contest/${contestId}/problem/${index}`,
            );
            if (!html || html === "") {
                throw new Error("Failed to get problem");
            }
            return html;
        } catch (error) {
            codeforcesChannel.appendLine(`Failed to get codeforces problem details: ${error}`);
            promptForOpenOutputChannel(`Failed to get problem details`, DialogType.error);
            return "";
        }
    }
}

export const codeforcesExecutor: CodeforcesExecutor = new CodeforcesExecutor();
