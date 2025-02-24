import config from './config';
import { Problem, CphSubmitResponse, CphEmptyResponse } from './types';
import { saveProblem } from './parser';
import * as vscode from 'vscode';
import path from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { isCodeforcesUrl, randomId } from './utils';
import {
    getDefaultLangPref,
    getLanguageId,
    useShortCodeForcesName,
    getMenuChoices,
    getDefaultLanguageTemplateFileLocation,
} from './preferences';
import { getProblemName } from './submit';
import { words_in_text } from './utilsPure';
import { judgeViewProvider } from '../webview/judgeViewProvider';
import { previewProblem } from '../commands/show';
import { CodeforcesNode } from '../explorer/CodeforcesNode';
import { IDescriptionConfiguration, IProblem } from '../shared';
import { codeforcesPreviewProvider } from '../webview/codeforcesPreviewProvider';
import { getDescriptionConfiguration } from '../utils/settingUtils';
import { codeforcesChannel } from '../codeforcesChannel';

const emptyResponse: CphEmptyResponse = { empty: true };
let savedResponse: CphEmptyResponse | CphSubmitResponse = emptyResponse;

/** Stores a response to be submitted to CF page soon. */
export const storeSubmitProblem = (problem: Problem) => {
    const srcPath = problem.srcPath;
    const problemName = getProblemName(problem.url);
    const sourceCode = readFileSync(srcPath).toString();
    const languageId = getLanguageId(problem.srcPath);
    savedResponse = {
        empty: false,
        url: problem.url,
        problemName,
        sourceCode,
        languageId,
    };
    // globalThis.logger.log('Stored savedResponse', savedResponse);
};

export const getProblemFileName = (problem: Problem, ext: string) => {
    if (isCodeforcesUrl(new URL(problem.url)) && useShortCodeForcesName()) {
        return `${getProblemName(problem.url)}.${ext}`;
    } else {
        const words = words_in_text(problem.name);
        if (words === null) {
            return `${problem.name.replace(/\W+/g, '_')}.${ext}`;
        } else {
            return `${words.join('_')}.${ext}`;
        }
    }
};

/** Handle the `problem` sent by Competitive Companion, such as showing the webview, opening an editor, managing layout etc. */
export const handleNewProblem = async (problem: Problem, node: CodeforcesNode, html: string): Promise<void> => {
    // If webview may be focused, close it, to prevent layout bug.
    if (vscode.window.activeTextEditor === undefined) {
        judgeViewProvider.extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
        });
    }
    const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (folder === undefined) {
        vscode.window.showInformationMessage('Please open a folder first.');
        return;
    }
    const defaultLanguage = getDefaultLangPref();
    let extn: string;

    if (defaultLanguage === null) {
        const allChoices = new Set(Object.keys(config.extensions));
        const userChoices = getMenuChoices();
        const choices = userChoices.filter((x) => allChoices.has(x));
        const selected = await vscode.window.showQuickPick(choices);
        if (!selected) {
            vscode.window.showInformationMessage(
                'Aborted creation of new file',
            );
            return;
        }
        // @ts-ignore
        extn = config.extensions[selected];
    } else {
        //@ts-ignore
        extn = config.extensions[defaultLanguage];
    }
    const problemFileName = getProblemFileName(problem, extn);
    const srcPath = path.join(folder, problemFileName);

    // Add fields absent in competitive companion.
    problem.srcPath = srcPath;
    problem.tests = problem.tests.map((testcase) => ({
        ...testcase,
        id: randomId(),
    }));
    if (!existsSync(srcPath)) {
        writeFileSync(srcPath, '');
    }
    saveProblem(srcPath, problem);
    const doc = await vscode.workspace.openTextDocument(srcPath);

    if (defaultLanguage) {
        const templateLocation = getDefaultLanguageTemplateFileLocation();
        if (templateLocation !== null) {
            const templateExists = existsSync(templateLocation);
            if (!templateExists) {
                vscode.window.showErrorMessage(
                    `Template file does not exist: ${templateLocation}`,
                );
            } else {
                let templateContents =
                    readFileSync(templateLocation).toString();

                if (extn === 'java') {
                    const className = path.basename(problemFileName, '.java');
                    templateContents = templateContents.replace(
                        'CLASS_NAME',
                        className,
                    );
                }
                writeFileSync(srcPath, templateContents);
            }
        }
    }

    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
    const descriptionConfig: IDescriptionConfiguration = getDescriptionConfiguration();
    if (descriptionConfig.showInWebview) {
        codeforcesChannel.appendLine(html);
        codeforcesChannel.appendLine(JSON.stringify(node));
        showDescriptionView(html, node.data);
    }
    judgeViewProvider.extensionToJudgeViewMessage({
        command: 'new-problem',
        problem,
    });
};

async function showDescriptionView(html: string, problem: IProblem): Promise<void> {
    codeforcesPreviewProvider.show(html, problem, true);
}