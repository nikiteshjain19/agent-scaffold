// Fails when two decision entries claim one id, or when an entry's heading opens with no id.
// CLAUDE.md §7 leaves this enforcement to the project, and D-51 chose this check.
// `npm run lint` runs it from the repository root.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "decisions.d";
const files = readdirSync(dir).filter((name) => name.endsWith(".md")).sort();
const claims = new Map();
const problems = [];

for (const name of files) {
  const file = join(dir, name);
  const firstLine = readFileSync(file, "utf8").split("\n", 1)[0];
  // Only the id that opens the heading is a claim. Any later id on the line is a mention.
  const match = /^# (D-[0-9]+[a-z]?) /.exec(firstLine);
  if (!match) {
    problems.push(`check-decision-ids: ${file} claims no id: its first line does not open with "# D-<id> "`);
    continue;
  }
  claims.set(match[1], [...(claims.get(match[1]) ?? []), file]);
}

for (const [id, claimants] of claims) {
  if (claimants.length > 1) {
    problems.push(`check-decision-ids: ${id} is claimed by ${claimants.length} files: ${claimants.join(", ")}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(`check-decision-ids: ${files.length} decision entries checked, and every id is unique`);
