import { CodeforcesNode } from "../explorer/CodeforcesNode";
import { explorerNodeManager } from "../explorer/explorerNodeManager";
import { IProblem, IQuickItemEx, ProblemState } from "../shared";
import * as vscode from "vscode";

export async function pickOne(): Promise<void> {
    const problems: CodeforcesNode[] = explorerNodeManager.getAllNodes();
    const ratings = explorerNodeManager.getAllRatingNodes();
    const ratingPick = vscode.window.createQuickPick<IQuickItemEx<string>>();
    ratingPick.placeholder = "Pick rating";
    ratingPick.items = [{ label: "RANDOM", value: "RANDOM" }, ...ratings.map((node: CodeforcesNode) => {
        return {
            label: node.name,
            value: node.name,
        };
    })];
    ratingPick.onDidAccept(() => {
        const choice = ratingPick.selectedItems[0];
        if (choice) {
            if(choice.value === "RANDOM") {
                const randomProblem: IProblem = problems[Math.floor(Math.random() * problems.length)];
                vscode.window.showInformationMessage(`Selected: ${randomProblem.contestId}${randomProblem.index} ${randomProblem.name}`);
            } else {
                const filteredProblems = problems.filter((problem: IProblem) => problem.rating === parseInt(choice.value));
                const randomProblem: IProblem = filteredProblems[Math.floor(Math.random() * filteredProblems.length)];
                vscode.window.showInformationMessage(`Selected: ${randomProblem.contestId}${randomProblem.index} ${randomProblem.name}`);
            }
        }
        ratingPick.hide();
    });
    ratingPick.show();
}

export async function searchProblem(): Promise<void> {
    const nodes = explorerNodeManager.getAllNodes();
    const allPicks = parseProblemsToPicks(nodes);

    const quickPick = vscode.window.createQuickPick<IQuickItemEx<IProblem>>();
    quickPick.placeholder = "Type to search problems...";
    quickPick.items = allPicks;

    quickPick.onDidChangeValue(searchText => {
        quickPick.items = allPicks.filter(item =>
            item.label.toLowerCase().includes(searchText.toLowerCase()) ||
            (item.detail && item.detail.toLowerCase().includes(searchText.toLowerCase()))
        );
    });

    quickPick.onDidAccept(() => {
        const choice = quickPick.selectedItems[0];
        if (choice) {
            // Handle the selected problem
            vscode.window.showInformationMessage(`Selected: ${choice.label}`);
        }
        quickPick.hide();
    });

    quickPick.show();
}

function parseProblemsToPicks(p: CodeforcesNode[]): Array<IQuickItemEx<IProblem>> {
    const picks: Array<IQuickItemEx<IProblem>> = p.map((problem: IProblem) =>
        Object.assign(
            {},
            {
                label: `${parseProblemDecorator(problem.state)}${problem.contestId}${problem.index} ${problem.name}`,
                description: "",
                detail: `Solved count: ${problem.solvedCount}, Rating : ${problem.rating ? problem.rating : "UNKNOWN"}`,
                value: problem,
            }
        )
    );
    return picks;
}

function parseProblemDecorator(state: ProblemState): string {
    switch (state) {
        case ProblemState.ACCEPTED:
            return "$(check) ";
        case ProblemState.WRONG_ANSWER:
        case ProblemState.PARTIAL:
            return "$(x) ";
        default:
            return "";
    }
}