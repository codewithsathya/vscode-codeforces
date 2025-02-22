// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

class CodeforcesChannel implements vscode.Disposable {
    private readonly channel: vscode.OutputChannel =
        vscode.window.createOutputChannel("Codeforces");

    public appendLine(message: string): void {
        this.channel.appendLine(message);
    }

    public append(message: string): void {
        this.channel.append(message);
    }

    public show(): void {
        this.channel.show();
    }

    public dispose(): void {
        this.channel.dispose();
    }
}

export const codeforcesChannel: CodeforcesChannel = new CodeforcesChannel();
