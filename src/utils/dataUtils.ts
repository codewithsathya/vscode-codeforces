import _ from "lodash";
import { IContest, IProblem, Tags, UNKNOWN_RATING } from "../shared";
import { isTagGroupingEnabled } from "./settingUtils";
import fsExtra from "fs-extra";
import path from "path";

const questionCompanyTagsPath = '../../data/a2oj.json';

export function getA2oJProblems() {
    return fsExtra.readJSONSync(path.join(__dirname, questionCompanyTagsPath)) as Record<string, string[]>;
}

export function getRatings(problems: IProblem[]): Record<string, string[]> {
    const ratings: Record<string, string[]> = {};
    ratings[UNKNOWN_RATING] = [];
    const allRatingsSet = new Set<string>();
    for (const problem of problems) {
        if (problem.rating) {
            allRatingsSet.add(problem.rating.toString());
        }
    }
    const allRatings = Array.from(allRatingsSet).sort((a, b) => parseInt(a) - parseInt(b));
    for (const rating of allRatings) {
        ratings[rating] = [];
    }
    for (const problem of problems) {
        if (problem.rating) {
            const rating = problem.rating.toString();
            ratings[rating].push(problem.id);
        } else {
            ratings[UNKNOWN_RATING].push(problem.id);
        }
    }
    return ratings;
}

export function getTags(problems: IProblem[]): Tags {
    const tagGroupingEnabled = isTagGroupingEnabled();
    const tags: Tags = {};

    if (!tagGroupingEnabled) {
        const tagMap: Record<string, string[]> = {};

        for (const problem of problems) {
            for (let tag of problem.tags) {
                tag = _.startCase(tag);
                if (!tagMap[tag]) {
                    tagMap[tag] = [];
                }
                tagMap[tag].push(problem.id);
            }
        }

        const sortedTagKeys = Object.keys(tagMap).sort();
        for (const tag of sortedTagKeys) {
            tags[tag] = tagMap[tag];
        }

        return tags;
    }

    const allTagsSet = new Set<string>();
    for (const problem of problems) {
        for (const tag of problem.tags) {
            allTagsSet.add(_.startCase(tag));
        }
    }

    const sortedTags = Array.from(allTagsSet).sort();
    for (const tag of sortedTags) {
        tags[tag] = {};
    }

    for (const problem of problems) {
        for (let tag of problem.tags) {
            tag = _.startCase(tag);
            const ratingKey = problem.rating?.toString() || UNKNOWN_RATING;
            const tagGroup = tags[tag] as Record<string, string[]>;

            if (!tagGroup[ratingKey]) {
                tagGroup[ratingKey] = [];
            }
            tagGroup[ratingKey].push(problem.id);
        }
    }

    return tags;
}

export function getPastContestsMap(contests: IContest[], problems: IProblem[]): Record<string, string[]> {
    const validPhases = new Set(["FINISHED", "PENDING_SYSTEM_TEST", "SYSTEM_TEST"]);

    const filteredContests = contests
        .filter(contest => validPhases.has(contest.phase))
        .sort((a, b) => b.startTimeSeconds - a.startTimeSeconds);

    const contestProblemsMap = problems.reduce<Record<number, string[]>>((map, problem) => {
        const { contestId, id } = problem;
        if (!map[contestId]) {
            map[contestId] = [];
        }
        map[contestId].push(id);
        return map;
    }, {});

    return filteredContests.reduce<Record<string, string[]>>((map, contest) => {
        if (contestProblemsMap[contest.id] && contestProblemsMap[contest.id].length !== 0) {
            map[contest.name] = contestProblemsMap[contest.id].reverse() || [];
        }
        return map;
    }, {});
}

export function getRunningContestsMap(contests: IContest[], problems: IProblem[]): Record<string, string[]> {
    const filteredContests = contests
        .filter(contest => contest.phase === "CODING")
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

    const contestProblemsMap = problems.reduce<Record<number, string[]>>((map, problem) => {
        const { contestId, id } = problem;
        if (!map[contestId]) {
            map[contestId] = [];
        }
        map[contestId].push(id);
        return map;
    }, {});

    return filteredContests.reduce<Record<string, string[]>>((map, contest) => {
        map[contest.name] = contestProblemsMap[contest.id] || [];
        return map;
    }, {});
}

export function getUpcomingContestsMap(contests: IContest[]): Record<string, string[]> {
    const filteredContests = contests
        .filter(contest => contest.phase === "BEFORE")
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

    return filteredContests.reduce<Record<string, string[]>>((map, contest) => {
        map[contest.name] = [];
        return map;
    }, {});
}