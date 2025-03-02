import * as vscode from "vscode";
import { getProbSaveLocation } from "../cph/parser";
import { existsSync, readFileSync } from "fs";
import { Problem } from "../cph/types";
import { getProblemForDocument } from "../cph/utils";
import { getAutoShowJudgePref } from "../cph/preferences";
import { setOnlineJudgeEnv } from "../cph/compiler";
import { judgeViewProvider } from "./judgeViewProvider";

/**
 * Show the webview with the problem details if a source code with existing
 * saved problem is opened. If switch is to an invalid document of unsaved
 * problem, closes the active webview, if any.
 *
 * @param e An editor
 * @param context The activation context
 */
export const editorChanged = async (e: vscode.TextEditor | undefined) => {
    // globalThis.logger.log('Changed editor to', e?.document.fileName);

    if (e === undefined) {
        judgeViewProvider.extensionToJudgeViewMessage({
            command: "new-problem",
            problem: undefined,
        });
        setOnlineJudgeEnv(false); // reset the non-debug mode set in webview.
        return;
    }

    if (e.document.uri.scheme !== "file") {
        return;
    }

    setOnlineJudgeEnv(false); // reset the non-debug mode set in webview.

    const problem = getProblemForDocument(e.document);

    if (problem === undefined) {
        judgeViewProvider.extensionToJudgeViewMessage({
            command: "new-problem",
            problem: undefined,
        });
        return;
    }

    if (getAutoShowJudgePref() && judgeViewProvider.isViewUninitialized()) {
        vscode.commands.executeCommand("codeforces.judgeView.focus");
    }

    // globalThis.logger.log('Sent problem @', Date.now());
    judgeViewProvider.extensionToJudgeViewMessage({
        command: "new-problem",
        problem,
    });
};

export const editorClosed = (e: vscode.TextDocument) => {
    // globalThis.logger.log('Closed editor:', e.uri.fsPath);
    const srcPath = e.uri.fsPath;
    const probPath = getProbSaveLocation(srcPath);

    if (!existsSync(probPath)) {
        return;
    }

    const problem: Problem = JSON.parse(readFileSync(probPath).toString());

    if (judgeViewProvider.problemPath === problem.srcPath) {
        judgeViewProvider.extensionToJudgeViewMessage({
            command: "new-problem",
            problem: undefined,
        });
    }
};

export const checkLaunchWebview = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    editorChanged(editor);
};
