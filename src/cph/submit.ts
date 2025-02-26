import { getProblem } from './parser';
import * as vscode from 'vscode';
import { getLanguageId } from './preferences';
import fs from "fs";
import { getDetailsFromProblemUrl } from '../utils/urlUtils';
import { DialogType, promptForOpenOutputChannel } from '../utils/uiUtils';
import { codeforcesChannel } from '../codeforcesChannel';
import { browserClient } from '../browserClient';
import { Problem } from './types';

export const submitToCodeForces = async () => {
    const srcPath = vscode.window.activeTextEditor?.document.fileName;

    if (!srcPath) {
        vscode.window.showErrorMessage(
            'Active editor is not supported for submission',
        );
        return;
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage('Failed to parse current code.');
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        vscode.window.showErrorMessage('Not a codeforces problem.');
        return;
    }

    if (url.hostname !== 'codeforces.com') {
        vscode.window.showErrorMessage('Not a codeforces problem.');
        return;
    }

    await submitProblem(problem);

    // judgeViewProvider.extensionToJudgeViewMessage({
    //     command: 'waiting-for-submit',
    // });
};

export const submitProblem = async (problem: Problem) => {
    const languageId = getLanguageId(problem.srcPath);
    const details = getDetailsFromProblemUrl(problem.url);
    if(details === null) {
        promptForOpenOutputChannel(`Failed to submit`, DialogType.error);
        codeforcesChannel.appendLine(`Failed to submit: invalid url`);
        return;
    }
    const srcCode = fs.readFileSync(problem.srcPath).toString();
    await browserClient.submitProblem(details.contestId, details.index, languageId, srcCode);
};

/** Get the problem name ( like 144C ) for a given Codeforces URL string. */
export const getProblemName = (problemUrl: string): string => {
    const regexPatterns = [
        /\/contest\/(\d+)\/problem\/(\w+)/,
        /\/problemset\/problem\/(\d+)\/(\w+)/,
        /\/gym\/(\d+)\/problem\/(\w+)/,
    ];

    for (const regex of regexPatterns) {
        const match = problemUrl.match(regex);
        if (match) {
            return match[1] + match[2];
        }
    }

    return '';
};
