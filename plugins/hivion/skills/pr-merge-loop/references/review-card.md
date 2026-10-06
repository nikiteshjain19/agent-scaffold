# The review card — DECISION, WHAT IT DOES and EVIDENCE

Read this file before you build a review card in the `pr-merge-loop` skill's ESCALATE LANE, or a
WHAT IT DOES block in its AUTO LANE. Every other section name below names a section of that
skill's `SKILL.md`, and every EVIDENCE item keeps its number.

## The card has three blocks, printed in this order

Print **DECISION**, then **WHAT IT DOES**, then **EVIDENCE**. Separate each block from the next with
one blank line. Close with the merge ASK block in ESCALATE LANE, and print nothing else. The order
is fixed so that a user who stops after two lines still knows what you believe and what decides the
merge.

**DECISION — what the user has to decide.**

1. The header line: `#<num> — <title> — @<author>`, and the branch name.
2. The **BOTTOM LINE**: one sentence saying what you believe about this PR overall, and naming the
   finding that decides the merge. Write it so a user who reads nothing else can act on it.
3. One bullet per escalation reason. Say what you observed and what it means for this merge. Cite
   the condition number after the sentence, never instead of it.

**WHAT IT DOES — what lands if the user says yes.**

1. The plain-English summary: at most three bullets, one sentence each, and no jargon. This is what
   the user decides on, so make it genuinely understandable rather than a restatement of the diff.
2. The action items for the user, read off the changed files: database migrations, new or changed
   environment variables, dependency or lockfile changes, infrastructure, CI, Docker, Terraform or
   Kubernetes changes, breaking changes, and manual backfills. Label the line `Action items:`, and
   say concretely what the user has to DO and why. Write `Action items: None.` when there are none.
3. One line offering the technical detail: `Say "detail on #<num>" for what the diff actually
   changes.`

**Hold the technical detail off the card, and print it when the user asks.** Keep what the PR
changes in the code ready, from the current diff. Print it when the user says `detail on #<num>`, or
asks for the same thing in their own words. It never replaces the plain summary, and it never
precedes it.

**EVIDENCE — what you checked, and what it showed.**

**Restate these ten, in this order.** Together they cover all seven pre-merge checks, because
`CLAUDE.md` §6 voids an approval given without them. Give each one sentence. The card restates the
findings CLASSIFY, CONFLICT and PROBE already produced. Re-gather a finding only under the freshness
trigger in ESCALATE LANE. Each item names the escalation condition or the pre-merge check it
discharges. An item that discharges neither is marked **the card's own work**.

1. **Checks** (escalation condition 2) — restate what CLASSIFY read. Clear when every required check
   passed. Otherwise name the job, and say whether it failed or never reported.
2. **Conflict against current BASE** (pre-merge check 4, staleness against BASE) — restate what
   CONFLICT found. Clear when the merge is clean. Otherwise name the conflicting files, and report
   CONFLICT's classification and its reason. Name the hunks for a resolved conflict, and say what
   changed. Show the fresh verdict on the resolved head SHA beside them (CONFLICT). Name both sides
   for an `intent` conflict, and hold the card for the ASK block in CONFLICT.
3. **Body freshness** (pre-merge check 7) — restate what CLASSIFY condition 7 read against the
   current diff. Clear when the body still describes the diff. Otherwise name the sentence the diff
   no longer supports. A stale body fires escalation condition 7, so say so and ask the author to
   re-sync it before the merge. Never present a PR as ready on a body you know is stale.
4. **Tracker ticket** — two halves, and say which is which. Restate CLASSIFY condition 7's ticket
   finding, which says whether the ticket was cancelled, descoped or superseded (pre-merge check 5).
   The id resolution and the planned update are the card's own work: resolve the issue id from the
   PR title, branch name and description, per the id format in CONFIG. Clear when the id resolves,
   the ticket is still valid, and the planned update is the ordinary one: move it to the target
   state, and comment this PR plus the merge commit. Otherwise say no id resolves and that no
   tracker update will happen, or name the current state that changes the plan.
5. **Dependents to sweep** (the card's own work) — list every ticket that declares this PR's ticket
   as a blocker, with the signal each one carries. Clear when no ticket does. Otherwise name each
   ticket and its planned outcome: cleared, kept with the remaining blockers named, or left alone as
   unverifiable.
6. **Carry-over from PROBE** (the card's own work) — restate any risk-map flag for this PR: a
   semantic conflict, an ordering dependency, or schema drift. Clear when PROBE flagged nothing, or
   the flag is no longer live against the current state of BASE. Otherwise state the flag, and say
   it is still live.
7. **Correctness** (pre-merge check 1) — restate the verdict's check-1 line where an independent
   verdict exists. Otherwise write "not evaluated — no independent verdict".
8. **Decision freshness** (pre-merge check 2) — restate CLASSIFY condition 7's decision half. Clear
   when no entry BASE gained touches what this PR changes. Otherwise name the entry.
9. **Duplicate** (pre-merge check 3) — read the open PRs, plus the PRs merged into BASE since the
   branch point, at every queue size. Clear when none of them implements this change. Otherwise
   name the PR that overlaps.
10. **Out-of-band verification** (pre-merge check 6) — read the steps the PR body declares. Clear
    when the body declares none. Otherwise name each step, and say it must be applied and verified
    outside the repository.

**A restated finding that contradicts this PR's row in the classification table is a STOP.** Print
both readings. Name the disagreement in plain English. Report it, and pick neither. Merge nothing on
either reading. Two readings of one commit cannot both be right, and choosing between them is
merging to resolve uncertainty, which this file forbids in both lanes. **Ask it in place, and
wait** (ASK BLOCK). `CLAUDE.md` §13 asks a contradiction the run cannot reason past in place.

**Collapse the evidence that carries no finding.** Give a bullet to each of the ten that carries a
finding. Name every one that does not on a single `Clear:` line, each with its answer in a few
words. Print that line last in the block, inside the card's length budget. Omit it when all ten
carry a finding. **Never drop a finding to save a line.**

## The card has a length budget

Check these numbers before you print:

- The whole card above the ASK block: **25 lines or fewer.**
- The plain-English summary: **at most three bullets, one sentence each.**
- Every escalation reason, and every evidence bullet: **one sentence, on one line.**
- The BOTTOM LINE: **one sentence.**

Count the lines you print, and count each blank separator as one. A line that wraps on the reader's
screen is still one line. Cut words to come in under the budget. **Never cut a finding, and never
trade a plain sentence for a condition number.** Brevity buys back nothing the PLAIN-LANGUAGE RULE
requires.

A worked card, for a PR carrying one real finding. It is the card body: the merge ASK block in ESCALATE
LANE closes it, and the budget does not count that block.

```text
DECISION
#141 — Stop the login page accepting unlimited password guesses — @dana (branch: feat/141-login-cap)
This one is ready and I would merge it, and the only thing holding it is the file it edits.
- It changes `CLAUDE.md`, and this project sends every change to that file to a person,
  whatever the checks say (escalation condition 1).

WHAT IT DOES
- Someone guessing passwords at the login page is now cut off after five tries a minute.
- It exists because the issue asks for a cap before the login page goes public.
- If it broke, a real person retyping their own password would be shut out too.
Action items: None. Nothing to migrate, configure or deploy by hand.
Say "detail on #141" for what the diff actually changes.

EVIDENCE
- Two tickets are waiting on this one: #148 stops waiting the moment this merges, and #150
  keeps its mark because #133 is still open.
- Clear: checks passed, merges cleanly, the body matches the diff, ticket #141 resolves and
  closes on merge, PROBE flagged nothing, the reviewer found no defect, no newer decision
  touches it, no other PR duplicates it, nothing to apply by hand.
```
