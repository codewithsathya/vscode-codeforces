const bodyNode = $0;
const problems = bodyNode.children;
const ids = [];
for(let i = 1; i < problems.length; i++) {
    let url = problems[i].children[1].firstChild.getAttribute("href");
    const match = url.match(/problem\/(\d+)\/([A-Z])/);

    if (match) {
        const problemId = `${match[1]}:${match[2]}`;
        ids.push(problemId);
    }
}
console.log(JSON.stringify(ids));
