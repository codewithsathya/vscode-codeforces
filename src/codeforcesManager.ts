import * as vscode from "vscode";
import { DialogType, promptForOpenOutputChannel } from "./utils/uiUtils";
import { browserClient } from "./browserClient";
import { codeforcesChannel } from "./codeforcesChannel";
import { globalState } from "./globalState";
import { setCodeforcesHandle } from "./commands/plugin";

class CodeforcesManager {
    public async signIn() {
        let username: string | undefined = await vscode.window.showInputBox({
            title: "Login to Codeforces",
            prompt: "Enter your Codeforces handle/email",
            ignoreFocusOut: true,
        });

        if (!username || username === "") {
            return;
        }
        username = username.trim();

        let password: string | undefined = await vscode.window.showInputBox({
            title: "Login to Codeforces",
            prompt: "Enter your Codeforces password",
            password: true,
            ignoreFocusOut: true,
        });

        if (!password || password === "") {
            return;
        }
        password = password.trim();

        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Logging in to Codeforces...",
                },
                async () => {
                    await this.handleSignIn(username, password);
                },
            );
        } catch (error) {
            promptForOpenOutputChannel(
                `Failed to log in. Please open the output channel for details`,
                DialogType.error,
            );
        }
    }

    public async signOut() {
        await browserClient.logout();
    }

    public async handleSignIn(username: string, password: string) {
        try {
            const { cookies, handle } = await browserClient.login(
                username,
                password,
            );
            await setCodeforcesHandle(handle);
            await globalState.saveCookies(cookies);
            promptForOpenOutputChannel(
                `Login successful`,
                DialogType.completed,
            );
        } catch (error) {
            promptForOpenOutputChannel(
                `Failed to login to codeforces`,
                DialogType.error,
            );
            codeforcesChannel.appendLine(
                `Failed to login to codeforces: ${error}`,
            );
        }
    }
}

export const codeforcesManager = new CodeforcesManager();
