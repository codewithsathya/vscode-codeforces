import * as vscode from "vscode";

const keys = ["codeforcesProblems", "codeforcesContests", "csesProblems"];

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

    public getGlobalStoragePath(): string {
        return this.context.globalStorageUri.fsPath;
    }

    public get(key: string) {
        return this._state.get(key);
    }

    public async update(key: string, value: any) {
        await this._state.update(key, value);
    }

    public getFavorite(): Record<string, boolean> {
        const favorite = this.get("favorite");
        if (favorite) {
            return favorite as Record<string, boolean>;
        } else {
            return {};
        }
    }

    public async setFavorite(problemId: string, isFavorite: boolean) {
        const currentFavorite = this.getFavorite();
        if (isFavorite) {
            currentFavorite[problemId] = true;
        } else {
            delete currentFavorite[problemId];
        }
        await this._state.update("favorite", currentFavorite);
    }

    public async getWithBackgroundRefresh<T>(key: string, fetchFn: () => Promise<T>): Promise<any> {
        const cached = this.get(key);
        if (cached) {
            fetchFn().then((fresh) => this.update(key, fresh)).catch(() => {});
            return cached;
        } else {
            const fresh = await fetchFn();
            await this.update(key, fresh);
            return fresh;
        }
    }

    public async clear() {
        for (const key of keys) {
            await this._state.update(key, undefined);
        }
    }
}

export const globalState: GlobalState = new GlobalState();
