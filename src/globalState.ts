import * as vscode from "vscode";

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
}

export const globalState: GlobalState = new GlobalState();
