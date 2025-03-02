export function getFormattedDate(epochTime: number): string {
    const date = new Date(epochTime * 1000);
    const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    };
    return date
        .toLocaleString("en-US", options)
        .replace(",", "")
        .replace(" ", "/")
        .replace(" ", "/");
}

export function formatDuration(seconds: number) {
    const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    return `${hours}:${minutes}`;
}
