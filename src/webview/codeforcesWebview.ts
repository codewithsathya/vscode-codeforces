// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import {
    commands,
    ConfigurationChangeEvent,
    Disposable,
    ViewColumn,
    WebviewPanel,
    window,
    workspace,
} from "vscode";
import * as vscode from "vscode";

import { globalState } from "../globalState";

import { markdownEngine } from "./markdownEngine";

export abstract class CodeforcesWebview implements Disposable {
    protected readonly viewType: string = "codeforces.webview";
    protected panel: WebviewPanel | undefined;
    private listeners: Disposable[] = [];

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }

    public getPanel() {
        return this.panel;
    }

    protected showWebviewInternal(): void {
        const { title, viewColumn, preserveFocus } = this.getWebviewOption();
        if (!this.panel) {
            this.panel = window.createWebviewPanel(
                this.viewType,
                title,
                { viewColumn, preserveFocus },
                {
                    enableScripts: true,
                    enableCommandUris: true,
                    enableFindWidget: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        ...markdownEngine.localResourceRoots,
                        vscode.Uri.joinPath(
                            globalState.getExtensionUri(),
                            "public",
                        ),
                    ],
                },
            );
            this.panel.onDidDispose(
                this.onDidDisposeWebview,
                this,
                this.listeners,
            );
            this.panel.webview.onDidReceiveMessage(
                this.onDidReceiveMessage,
                this,
                this.listeners,
            );
            workspace.onDidChangeConfiguration(
                this.onDidChangeConfiguration,
                this,
                this.listeners,
            );
        } else {
            this.panel.title = title;
            if (viewColumn === ViewColumn.Two) {
                // Make sure second group exists. See vscode#71608 issue
                commands
                    .executeCommand("workbench.action.focusSecondEditorGroup")
                    .then(() => {
                        this.panel!.reveal(viewColumn, preserveFocus);
                    });
            } else {
                this.panel.reveal(viewColumn, preserveFocus);
            }
        }
        this.panel.webview.html = this.getWebviewContent();
        this.showMarkdownConfigHint();
    }

    protected onDidDisposeWebview(): void {
        this.panel = undefined;
        for (const listener of this.listeners) {
            listener.dispose();
        }
        this.listeners = [];
    }

    protected async onDidChangeConfiguration(
        event: ConfigurationChangeEvent,
    ): Promise<void> {
        if (this.panel && event.affectsConfiguration("markdown")) {
            this.panel.webview.html = this.getWebviewContent();
        }
    }

    protected async onDidReceiveMessage(_message: any): Promise<void> {
        /* no special rule */
    }

    protected abstract getWebviewOption(): ICodeforcesWebviewOption;

    protected abstract getWebviewContent(): string;

    private async showMarkdownConfigHint(): Promise<void> {}
}

export interface ICodeforcesWebviewOption {
    title: string;
    viewColumn: ViewColumn;
    preserveFocus?: boolean;
}
