# CONFLICT — run for any PR that conflicts with BASE

Read this file when the host reports a PR as not cleanly mergeable against BASE. Every other
section name below names a section of the `pr-merge-loop` skill's `SKILL.md`, and every step
keeps the number other documents cite.

Run this phase after CLASSIFY and before either lane acts on the PR. Run it whenever the host
reports the PR as not cleanly mergeable against BASE.

**Most conflicts are not a disagreement.** Two branches add an entry to the same directory. One
side reformats a paragraph the other side edits. Both sides make the same fix. There is no winner
to pick, and sending those to a human buys no safety.

**A minority are the real thing.** Two tickets want opposite outcomes in the same place, and git is
only where that becomes visible. An agent resolving one of those picks a winner between two
intents. It produces something plausible either way, including when it picks wrong. This phase
exists to separate the two cases, and to keep protecting the second.

## Two gates first — either one forbids a resolution

1. **Lock.** Is this PR part of an unresolved locked pair from PROBE? Do not classify its conflict.
   Do not resolve it. Hold it under the HARD STOP in the escalate lane until the user rules.
2. **Authorship.** Did you write a commit carrying this PR's own work? Do not resolve its conflict.
   Report the conflict, and let the escalate lane present it. Answer `yes` if you cannot tell.

## Read every hunk before you classify anything

1. `git fetch origin`.
2. Read the merge state: `gh pr view <num> --json mergeable,mergeStateStatus`.
3. Cut a scratch worktree from the PR's head ref. Never do this work in your own checkout.
4. Merge BASE into the scratch worktree: `git merge origin/<BASE>`.
5. List the conflicting files: `git diff --name-only --diff-filter=U`.
6. Read every conflicting hunk in every conflicting file. Read the whole hunk, not the markers.

**One `intent` hunk makes the whole conflict `intent`.** A conflict is `mechanical` only when every
hunk in every conflicting file is mechanical. Never resolve part of a conflict and escalate the
rest.

## `mechanical` — the three shapes

A hunk is mechanical only when it matches one shape below and trips no disqualifier. Both sides are
independently correct in all three shapes. The file's own format determines the resolution.

**M1 — two additions of separate whole items.** Both sides add new items to the same list, table,
directory or section. Neither side edits an existing item. Neither side deletes one. Keep both
items, in the order the file's format dictates.

- Check that every changed line on each side is an added line.
- Check that the two sides add different items, by id, key, filename or heading.
- Name the ordering rule you applied — filename order, numeric order, alphabetical, or append.

**M2 — a reformat against an edit.** One side changes layout only. The other side changes content.
Take the content from the editing side. Take the layout from the reformatting side.

- Normalise whitespace and line wrapping on the reformatting side, before and after.
- Check that the two normalised forms are identical.
- Treat a changed word, number, path or punctuation mark as content, never as layout.

**M3 — the identical change made twice.** Both sides make the same change. Keep that change once.

- Normalise whitespace on both sides.
- Check that the two normalised results are identical.

## Disqualifiers — any one makes the hunk `intent`

Check all six against every hunk. A disqualifier overrides a shape that matched.

1. **X1 — the two additions contradict each other.** One makes the other false, or keeping both
   leaves the file self-contradictory. Read what the two items *say*, not how they are laid out. A
   real disagreement often wears a mechanical shape, and this is the check that catches it.
2. **X2 — the two additions name the same item**: the same id, key, filename or heading. Two
   entries claiming one id is a disagreement about one thing, not two additions of separate things.
3. **X3 — either side edits or deletes a line the other side also edits or deletes.**
4. **X4 — the order of the kept items carries meaning, and the format does not fix it**: a
   precedence list, a pipeline, a middleware chain, a migration sequence.
5. **X5 — a tool generates the file**: a lockfile, a build artifact, a compiled asset. Its correct
   resolution is to re-run the tool, and that is not a text merge.
6. **X6 — you cannot name the format rule that determines the resolution.** Classify `intent`
   whenever picking a side requires knowing what the project wants.

## `intent` — everything else, and it is the default

Classify a conflict `intent` when any hunk matches no shape. Classify it `intent` when any
disqualifier fires. Classify it `intent` whenever you are unsure.

**A conflict you cannot classify is `intent`.** Absent evidence is not evidence of safety
(`CLAUDE.md` §6). Uncertainty is never resolved by resolving.

## RESOLVE a `mechanical` conflict — on the branch, never inside the merge

1. Resolve each hunk by the shape that matched it. Add nothing the two sides do not already say.
2. Run the project's checks in the scratch worktree, if its commands run in this environment.
3. Commit the resolution on its own. Name the PR and the classification in the message.
4. Push to the PR's branch: `git push origin HEAD:<headRefName>`.
5. Never force-push. Never push to BASE. A resolution is a commit on the branch, and only there.
6. Read the checks on the new head SHA yourself, once the push lands. When none has reported,
   re-poll once after about a minute (escalation condition 2). A required check still pending after
   that re-poll is not success: escalate the PR under condition 2, and move to the next PR. Never
   wait longer than that. The go-ahead guard in the escalate lane re-reads the checks before any
   merge.
7. Escalate the PR and stop if any check fails. Do not resolve again. Do not revert.
8. Re-run CLASSIFY for this PR. The head SHA moved, so the previous classification is void.
9. Remove the scratch worktree.

**State why the resolution goes on the branch.** A conflict resolved inside the merge lands a diff
that no review saw and no check ran on. Resolving on the branch keeps the property that what merges
is what was reviewed. CONFLICT merges BASE in only when the host reports a conflict. Testing a clean
but stale branch against BASE is pre-merge check 4, which the `pr-reviewer` skill performs. This
phase defines the mechanical/intent boundary that check cites.

**Merge BASE in. Never rebase.** A rebase needs a force-push, which destroys the commits a reviewer
already read. A merge commit also keeps the resolution readable on its own.

**A risk-list path does not block a resolution.** Condition 1 still escalates the PR, so a human
reads the resolved diff before it merges. Resolving a mechanical conflict changes no intent and
removes no gate.

## A resolution voids every approval the PR already carried

The diff changed, so nothing granted before the resolution still applies.

- **A human approval lapses** (`CLAUDE.md` §6, approval-gate rule 4). Re-present the review card,
  and ask again for this PR.
- **The reviewer's verdict lapses.** It belonged to the previous head SHA (private D-26).
- **The classification lapses.** Re-run CLASSIFY against the resolved head SHA.

**In the auto lane, a resolved PR never merges on a pre-resolution verdict.** The lane re-invokes
the independent reviewer on the resolved head SHA. That reviewer reads the resolution commit as
part of the diff. A resolved PR merges without a human only on a fresh `approve` covering the
resolved diff. Anything else sends it to the escalate lane — a different verdict, no verdict, or a
reviewer that did not run.

**In the escalate lane, a resolved PR needs a fresh verdict, of any value, on the resolved head
SHA.** Dispatch the independent reviewer on that head, as AUTO LANE step 4 does. Show the verdict on
the card. Merge nothing on the PR until that verdict exists (`CLAUDE.md` §6, approval gate rule 2).

**A resolution commit does not make you the PR's author.** The authorship gate asks whether you
wrote a commit carrying the PR's own work. A mechanical resolution carries none, which is what the
classification asserts. The exemption covers a resolution commit you pushed under this phase, and
nothing else. Escalate the PR when you cannot tell your resolution commit apart from your other
commits on that branch.

## ESCALATE an `intent` conflict — name both sides, pick no winner

1. Do not resolve it. Do not resolve part of it. Do not merge it.
2. Send the PR to the escalate lane, whatever CLASSIFY printed for it.
3. Name the conflicting file and the hunk.
4. State what the branch says, in plain English.
5. State what BASE says, in plain English. BASE is the branch this PR merges into.
6. State why both cannot hold at once.
7. Close with one ASK block asking which side the project wants.

```text
ASK — In `CLAUDE.md`, should a stale PR body escalate the PR, or only be reported?

  A) "the branch wins"  (recommended — the branch is the newer decision, and private
     D-80 ruled that a stale body escalates)
     → I tell the author to take the branch's wording, and the PR comes back for review.
  B) "main wins"
     → I tell the author to drop that hunk and keep what is on the default branch.
  C) "neither — I'll rewrite it"
     → I leave both alone and wait for your wording.

  Blocked until you answer: #NN. I merge nothing on it and change no ticket.
```

**Never pick a side, and never present the two sides without asking.** A named pair of positions
with no question is a report, and this stop needs a decision.

**Queue that block and continue** (`CLAUDE.md` §13). This conflict blocks one PR, so it never
blocks the run. The PR contributes one entry to the digest — the conflict ruling. Ask its merge
question only after the user rules, and never both in one entry.

This is the locked-pair rule applied to a branch-versus-BASE conflict, and nothing here relaxes it.
Do not add the PR to the lock list, which records unmerged pairs. Record the conflict in the risk
map instead, and carry it onto the PR's review card.

## Print the conflict table — mechanical rows included

Print one row per conflicting file, for every conflicting PR:

| PR | File | Hunks | Class | Rule | Resolution |
| --- | --- | --- | --- | --- | --- |
| #NN | `decisions.d/` | 1 | mechanical | M1, filename order | kept both entries, pushed `abc1234` |
| #NN | `CLAUDE.md` | 2 | intent | X1, the two rules contradict | none, escalated to the user |

**Print the reason for a `mechanical` row too.** Name the shape that matched. Name the
disqualifiers you cleared. State what you changed in each hunk. A classifier whose decisions are
invisible cannot be audited, and an unaudited classifier is how a wrong resolution goes unnoticed.

**Say what each row means in words, under the table.** The Rule cell holds a shape code, and a
shape code is a citation rather than an explanation (PLAIN-LANGUAGE RULE). Write one sentence per
row: "Both PRs added a new decision file, so I kept both and ordered them by filename (M1)."
