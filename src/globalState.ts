import * as vscode from "vscode";
import type { Cookie } from "rebrowser-puppeteer-core";

class GlobalState {
    private context!: vscode.ExtensionContext;
    private _state!: vscode.Memento;

    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        this._state = this.context.globalState;
    }

    public getExtensionUri(): vscode.Uri {
        return this.context.extensionUri;
    }

    public get(key: string) {
        return this._state.get(key);
    }

    public async update(key: string, value: any) {
        await this._state.update(key, value);
    }

    public async saveCookies(cookies: Cookie[]) {
        await this.update("codeforces.cookies", cookies);
    }

    public getCookies(): Cookie[] {
        const cookies = this.get("codeforces.cookies") as undefined | Cookie[];
        if (!cookies) {
            return [];
        }
        return cookies;
    }
}

export const globalState: GlobalState = new GlobalState();
