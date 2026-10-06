# REPAIR — fix a defect on the branch, then hand the PR off

Read this file when CLASSIFY, CONFLICT, PROBE or a non-approve reviewer verdict finds a
repairable defect. Every other section name below names a section of the `pr-merge-loop` skill's
`SKILL.md`, and every bound keeps the number other documents cite.

Run this phase after CONFLICT and before either lane acts on the PR. Run it for any PR where
CLASSIFY, CONFLICT or PROBE found a defect on the repairable list below, whatever lane the PR was
classified into. Run it too for the repairable findings (R1–R5) of a non-approve reviewer verdict
from AUTO LANE step 6. Those findings go through the same bounds, before the escalate lane.

**Reporting a defect and handing the PR back to its author costs a whole session.** The author's
loop has to be scheduled again for a failing lint job, or for one sentence in a PR body. This phase
fixes it here instead, and pays one price for that: a repair makes you the branch's author, so you
never merge that PR (`CLAUDE.md` §6). A later session that did not write the repair merges it.

## Two gates first — either one forbids a repair

1. **Lock or `intent` conflict.** Is this PR part of an unresolved locked pair, or did CONFLICT
   classify its conflict `intent`? Do not repair it. Hold it under the HARD STOP in the escalate
   lane until the user rules.
2. **Authorship.** Did you write a commit carrying this PR's own work? Do not repair it. The
   hand-off block in the escalate lane applies unchanged. Answer `yes` if you cannot tell — a
   repair stacked on your own work is a repair you can never separate from it again.

## Repair only these five, and name the one you are repairing

A finding is repairable only when it matches one shape below. Name the shape and the finding before
you touch anything.

- **R1 — a required check fails because of this diff.** The failure is caused by what this PR
  changed, and fixing the code or the document makes the check pass.
- **R2 — the PR body no longer describes the diff** (pre-merge check 7). The repair is the body,
  and it needs no commit.
- **R3 — a correctness defect in the diff** (pre-merge check 1): a bug, an unchecked
  silent-failure result, a missing error path, or an unjustified line. An unjustified line matches
  a shape in `CLAUDE.md` §4, "Justify every line you write". Remove that line. Inline a helper with
  one caller into that caller. Never remove a line the acceptance criteria name explicitly. Such a
  line is not filler. Escalate a line when you cannot tell whether it matches a shape.
- **R4 — a required test is missing** (`CLAUDE.md` §11 rules 1–3): nothing asserts the changed
  behaviour, or the failure branch is untested.
- **R5 — a document this change makes false** (`CLAUDE.md` §5 rule 6) that the issue's declared
  footprint already names.

## Never repair these — none of them is a defect

| Finding | Why it is not repairable |
| --- | --- |
| A risk-listed path (escalation condition 1) | The PR is correct. The condition asks a human to look. |
| A footprint stray (condition 3) | Reverting it, or widening the issue, is a scope decision. Only the independent reviewer approves a widening (K10). |
| A test deleted, skipped or weakened (condition 4) | `CLAUDE.md` §11 rule 10 sends this to a human, always. |
| A diff over the size threshold (condition 5) | Splitting a PR decides scope on the user's behalf. |
| A cancelled ticket, or a contradicting decision (condition 7) | Only the user can say what the project now wants. |
| An effect a revert cannot undo (condition 8) | Removing the effect changes what the PR does, which is a scope decision. |
| An `intent` conflict, or a locked pair | Both sides want opposite things, and picking one is the user's call. |
| A PR whose own work you authored | You could never separate your repair from your own work again. |

**Escalate the finding instead, and say what you would have changed.** A finding you cannot place
on either list is not repairable. Absent evidence is not evidence of safety (`CLAUDE.md` §6).

## The bounds — every one holds on every repair

1. **Repair every repairable finding, in as many passes as it takes.** A finding the first pass
   revealed is repaired too, and so is one the user reports afterwards. **A half-repaired record is
   worse than an unrepaired one**, because the passages you did fix make the ones you missed read as
   checked. Finish the job.
   - **Audit before you declare a pass complete.** Read the whole body, or the whole file, against
     the current diff — never spot-check the passages you already know about. A repair that fixes a
     detail buried in a document and leaves its opening summary contradicting the diff has repaired
     nothing a reader will see.
   - **Two things still stop a pass, and neither is a counter.** Bound 5 discards a repair whose
     gate failed, and bound 9 forbids repairing again to chase a red check. Escalate there. Those
     bound failures, not a pass count, are what stop an agent iterating.
   - **Record each pass**, per the record section below. A later pass that corrects an earlier one
     says so, and never silently rewrites the earlier record.
   - **Bounds 2 to 9 hold on every pass.** Run bounds 10 to 12 once, after the last pass.
2. **Work in a scratch worktree** cut from the PR's head ref. Never repair in your own checkout.
3. **Touch only files the issue's declared footprint already names**, plus the PR body. Stop and
   escalate when a repair needs a file outside it, and name that file. This is what stops a repair
   manufacturing a footprint stray. A repairer that needs such a file writes a K10f request in the
   PR body, then stops under this bound. It never touches that file.
4. **Run the project's whole pre-PR gate** in that worktree, from the "Build / lint / test commands"
   section of `PROJECT.md`. Read each command's exit status yourself.
5. **Discard the repair and escalate when the gate fails.** Never push a repair you did not watch
   pass. Report what you tried.
6. **Never weaken, skip or delete a test to make the gate pass** (`CLAUDE.md` §11 rule 10). That
   rule has no exception, and a repair is not one.
7. **One commit, and one push, per repair pass.** Write the message as `fix: repair #<num> per
   merge-loop review (<ticket-id>)`. Push with `git push origin HEAD:<headRefName>`. Batch the
   findings you already know about into one pass rather than pushing a commit per finding.
8. **Never force-push, and never push to BASE.** A repair is a commit on the PR branch, and only
   there.
9. **Read the checks on the new head SHA yourself.** Escalate and stop on anything other than
   success. Never repair again to chase a red check. When none has reported, re-poll once after
   about a minute (escalation condition 2). A required check still pending after that re-poll is
   not success: escalate under condition 2, and move to the next PR. Never wait longer than that.
10. **Re-run CLASSIFY against the new head SHA.** The diff moved, so the classification, any
    reviewer verdict and any human approval all lapse — the same lapse CONFLICT declares for a
    resolution.
11. **Send the PR to the escalate lane for the rest of the run**, whatever that fresh
    classification says, and close it with the hand-off block below. You wrote this repair, so you
    are the branch's author and this run never merges that PR. A later run that wrote nothing here
    reads the record differently (AUTO LANE).
12. **Remove the scratch worktree.**

## Leave the record — the next session reads it, not your memory

Post one comment per pass on the PR, headed `REPAIRED BY THE MERGE LOOP — PASS <n>`, carrying:

1. The pass number, counted from 1 across this run.
2. Each finding you repaired in this pass, its shape, and what you changed for it.
3. The commit SHA you pushed, or `body only` for an R2 repair.
4. Each gate command you ran, and the status you read.
5. One sentence: a session that did not write this repair must review it before it merges.

**A later pass that corrects an earlier one says so, in its own comment.** Name the earlier pass by
number. Say what that pass got wrong, and what this pass changed instead. **Never edit an earlier
comment, and never delete one.** A rewritten record hides the correction from the reader it was
written for.

Then `ADD_COMMENT` one line on the ticket per pass, naming the repair and linking the PR
(`CLAUDE.md` §2).

**These comments are the durable record, and CLASSIFY's third gate reads them.** Your own memory
ends with this run. Post each pass's comment before you start the next pass, and report a comment
that failed to post rather than continuing as though it landed.

**A pass that posted no comment did not happen, as far as the next session can tell.** Stop there,
and escalate the PR. Never begin another pass on a record you could not write.

## Then hand the PR off

You are now the branch's author. You cannot merge this PR, and you cannot get a verdict on it
either: the `pr-reviewer` skill refuses an invocation from the branch's author, and that refusal
survives one level of indirection. Present the repair, then close with this block.

```text
ASK — I fixed the failing lint job on #NN. Shall I leave it for a fresh session to merge?

  Already tried: I rewrapped one over-long line in `README.md`, and the lint job now passes.

  A) "leave it for the next run"  (recommended — I wrote that fix, so my reading of it is
     not evidence; a session that did not write it can review and merge it)
     → I leave #NN open with the repair pushed and its ticket unchanged, and move on.
  B) "revert the repair"
     → I push a commit undoing my fix, comment that on #NN, and leave it as I found it.

  Blocked until you answer: nothing. I move to the next PR either way, and #NN merges in a
  later run.
```

**Queue that block and continue** (`CLAUDE.md` §13). A repair blocks one PR and never the run.

## Print the repair table

Print one row per pass, not one row per repaired PR. Order the rows by PR, then by pass number:

| PR | Pass | Finding | Shape | What changed | Gate | Pushed |
| --- | --- | --- | --- | --- | --- | --- |
| #NN | 1 | `Markdown lint` failed on a 112-column line | R1 | rewrapped one paragraph in `README.md` | 6/6 passed | `abc1234` |
| #NN | 2 | the body still described the old approach | R2 | rewrote two sentences of the body | not run (no commit) | body only |

**A row per pass is the only shape that stays true.** Each pass has its own gate result and its own
pushed SHA, so a single row per PR would hold several values in one cell. A reader cannot tell which
gate result belongs to which commit once that happens.

**Give every PR you repaired at least one row.** A PR repaired in three passes prints three rows.

**Say what each row means in words, under the table.** A shape code is a citation, never an
explanation (PLAIN-LANGUAGE RULE). Write one sentence per row: "The lint job failed on one
over-long line, so I rewrapped that paragraph and the job passed (R1)."

**Say how many passes each PR took, in the same plain words.** Write one sentence per repaired PR:
"#NN took two passes, because fixing the lint job revealed that the body no longer matched."
