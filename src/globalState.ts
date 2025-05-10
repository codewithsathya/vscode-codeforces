import * as vscode from "vscode";
import { CodeforcesSolution } from "./shared";

const CODEFORCES_SOLUTIONS_KEY = "codeforcesSolutions";
const CODEFORCES_PROBLEMS_CACHE_KEY = "codeforcesProblemsCache";
const keys = ["codeforcesProblems", "codeforcesContests", "csesProblems", CODEFORCES_SOLUTIONS_KEY, CODEFORCES_PROBLEMS_CACHE_KEY];

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

    public getSolutionDetails(): Record<string, CodeforcesSolution[]> {
        const solutions = this.get(CODEFORCES_SOLUTIONS_KEY);
        if(solutions) {
            return solutions as Record<string, CodeforcesSolution[]>;
        } else {
            return {};
        }
    }

    public async setSolutionDetails(solutions: Record<string, CodeforcesSolution[]>) {
        await this._state.update(CODEFORCES_SOLUTIONS_KEY, solutions);
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

    public getProblemHtml(id: string): string | null {
        const cache = this.get(CODEFORCES_PROBLEMS_CACHE_KEY) as Record<string, string>;
        if(!cache || !cache[id]) {
            return null;
        }
        return cache[id];
    }

    public async setProblemHtml(id: string, html: string) {
        let cache = this.get(CODEFORCES_PROBLEMS_CACHE_KEY) as Record<string, string>;
        if(!cache) {
            cache = {};
        }
        cache[id] = html;
        await this._state.update(CODEFORCES_PROBLEMS_CACHE_KEY, cache);
    }

    public async clear() {
        for (const key of keys) {
            await this._state.update(key, undefined);
        }
    }
}

export const globalState: GlobalState = new GlobalState();
