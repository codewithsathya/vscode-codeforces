import { URLSearchParams } from "url";

import {
    FileDecoration,
    FileDecorationProvider,
    ProviderResult,
    ThemeColor,
    Uri,
} from "vscode";

import { Category } from "../shared";
import {
    isColorizingEnabled,
    isTagGroupingEnabled,
} from "../utils/settingUtils";

export class CodeforcesTreeItemDecorationProvider
    implements FileDecorationProvider
{
    private readonly DIFFICULTY_BADGE_LABEL: { [key: string]: string } = {
        "800": "NE",
        "900": "NE",
        "1000": "NE",
        "1100": "NE",
        "1200": "PU",
        "1300": "PU",
        "1400": "SP",
        "1500": "SP",
        "1600": "EX",
        "1700": "EX",
        "1800": "EX",
        "1900": "CM",
        "2000": "CM",
        "2100": "MA",
        "2200": "MA",
        "2300": "IM",
        "2400": "GM",
        "2500": "GM",
        "2600": "IG",
        "2700": "IG",
        "2800": "IG",
        "2900": "IG",
        "3000": "LG",
        "3100": "LG",
        "3200": "LG",
        "3300": "LG",
        "3400": "LG",
        "3500": "LG",
    };

    private readonly ITEM_COLOR: { [key: string]: ThemeColor } = {
        "800": new ThemeColor("codeforces.newbie"),
        "900": new ThemeColor("codeforces.newbie"),
        "1000": new ThemeColor("codeforces.newbie"),
        "1100": new ThemeColor("codeforces.newbie"),
        "1200": new ThemeColor("codeforces.pupil"),
        "1300": new ThemeColor("codeforces.pupil"),
        "1400": new ThemeColor("codeforces.specialist"),
        "1500": new ThemeColor("codeforces.specialist"),
        "1600": new ThemeColor("codeforces.expert"),
        "1700": new ThemeColor("codeforces.expert"),
        "1800": new ThemeColor("codeforces.expert"),
        "1900": new ThemeColor("codeforces.candidateMaster"),
        "2000": new ThemeColor("codeforces.candidateMaster"),
        "2100": new ThemeColor("codeforces.master"),
        "2200": new ThemeColor("codeforces.master"),
        "2300": new ThemeColor("codeforces.internationalMaster"),
        "2400": new ThemeColor("codeforces.grandmaster"),
        "2500": new ThemeColor("codeforces.grandmaster"),
        "2600": new ThemeColor("codeforces.internationalGrandmaster"),
        "2700": new ThemeColor("codeforces.internationalGrandmaster"),
        "2800": new ThemeColor("codeforces.internationalGrandmaster"),
        "2900": new ThemeColor("codeforces.internationalGrandmaster"),
        "3000": new ThemeColor("codeforces.legendaryGrandmaster"),
        "3100": new ThemeColor("codeforces.legendaryGrandmaster"),
        "3200": new ThemeColor("codeforces.legendaryGrandmaster"),
        "3300": new ThemeColor("codeforces.legendaryGrandmaster"),
        "3400": new ThemeColor("codeforces.legendaryGrandmaster"),
        "3500": new ThemeColor("codeforces.legendaryGrandmaster"),
    };

    private getDecoration(rating: string): FileDecoration | undefined {
        if (rating === "UNKNOWN" || rating === "unknown") {
            return;
        }

        const label = this.DIFFICULTY_BADGE_LABEL[rating];
        if (!isColorizingEnabled()) {
            return { badge: label };
        }

        return {
            badge: label,
            color: this.ITEM_COLOR[rating],
        };
    }

    public provideFileDecoration(uri: Uri): ProviderResult<FileDecoration> {
        if (uri.scheme !== "codeforces") {
            return;
        }

        if (uri.authority !== "problems") {
            if (
                uri.path.includes(Category.Rating) ||
                uri.path.includes(Category.CP31)
            ) {
                const rating = uri.path.split("#")[1];
                return this.getDecoration(rating);
            }

            if (
                uri.path.includes(Category.Tag) &&
                isTagGroupingEnabled() &&
                uri.path.split("#").length === 3
            ) {
                const rating = uri.path.split("#")[2];
                return this.getDecoration(rating);
            }
            return;
        }

        const params = new URLSearchParams(uri.query);
        const rating = params.get("rating")?.toLowerCase();
        if (!rating) {
            return;
        }

        return this.getDecoration(rating);
    }
}

export const codeforcesTreeItemDecorationProvider: CodeforcesTreeItemDecorationProvider =
    new CodeforcesTreeItemDecorationProvider();
