import axios from "axios";
import { DialogType, promptForOpenOutputChannel } from "./utils/uiUtils";
import { codeforcesChannel } from "./codeforcesChannel";

class CsesExecutor {
    async getProblem(id: number): Promise<string> {
        try {
            const { data: html } = await axios.get(`https://www.cses.fi/problemset/task/${id}`);
            if (!html || html === "") {
                throw new Error("Failed to get problem");
            }
            return html as string;
        } catch (error) {
            codeforcesChannel.appendLine(`Failed to get CSES problem details: ${error}`);
            promptForOpenOutputChannel(`Failed to get CSES problem details`, DialogType.error);
            return "";
        }
    }
}

export const csesExecutor: CsesExecutor = new CsesExecutor();