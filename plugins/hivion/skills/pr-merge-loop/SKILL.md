---
name: pr-merge-loop
description: >-
  Review and merge open pull requests one at a time, sorted into two lanes by the
  risk-tiered gate in CLAUDE.md §6, then update each merged PR's tracker ticket and
  sweep the tickets that ticket blocked, clearing the dependency signal on every one
  whose blockers are now all complete. A PR that trips any of the eight escalation
  conditions waits for an explicit human approval; a PR that trips none may merge
  after an independent reviewer approves it. The run records each waiting question
  instead of stopping, and presents them all in one digest at the end.
  Fail-closed: a condition it cannot evaluate counts as met. Tool-agnostic: the repo
  host, base branch, merge strategy, green signal, risk-list paths, size threshold and
  issue tracker (Linear, Jira, GitHub Issues, GitLab, etc.) are read from PROJECT.md,
  not hard-coded. Runs a read-only PROBE first (cross-PR conflicts, schema drift, lock
  list), at every queue size — at a queue of one open PR its cross-batch steps degenerate,
  because they read a pair. Then it classifies every PR and prints the reason. Also classifies
  every conflict against the base branch as mechanical or intent: it resolves a
  mechanical one on the branch and re-checks it, and it escalates an intent one with
  both sides named. It repairs a defect it finds — a failing check, a stale PR body, a
  correctness bug, a missing test — on the branch itself rather than handing the PR back
  to its author, and then hands that PR to a later session, because a repair makes this
  run the branch's author. Use when the user says "review and merge the open PRs", "clear
  the PR queue", "merge the backlog of PRs", or similar.
---

# PR Review & Merge Loop (tracker- and host-agnostic)

Help the user clear the open pull requests, and update each merged PR's tracker ticket. Then sweep
the tickets that ticket blocked, so no dependency signal outlives its blocker. Follow this loop
exactly.

The loop sorts every PR into one of two lanes. `CLAUDE.md` §6 is the sorting rule, and this skill
implements it rather than restating a different one.

- **Escalate lane** — the user decides. The review card states the findings in plain English,
  reconciles them into one bottom line, and closes with one question the user can answer. The run
  records that question in the escalation queue and moves to the next PR (`CLAUDE.md` §13). The
  DIGEST presents every recorded question at the end, in one place.
- **Auto lane** — an agent merges without asking. A PR reaches it only when it trips none of the
  eight escalation conditions and an independent reviewer returns `approve`.

**Everything this loop presents is written for a reader who has not read the rules.** The user
decides; the vocabulary of the gate is yours, not theirs. See PLAIN-LANGUAGE RULE and ASK BLOCK.

**The bias is fail-closed.** A condition you cannot evaluate counts as met, and the PR escalates.
Missing data, an undeclared `PROJECT.md` field and a check that never reported all read the same
way. Absent evidence is not evidence of safety.

**Two rules never relax, in either lane.** An agent never merges a PR it authored. No agent ever
merges to resolve uncertainty.

**A conflict against BASE is classified before either lane acts on the PR.** A mechanical conflict
is resolved on the branch, pushed, and re-checked. An intent conflict is escalated with both sides
named and no winner picked. See CONFLICT.

**Expect most PRs to escalate where the risk list is broad.** In a repository whose product is its
own governance, nearly every path is risk-listed, so nearly every PR escalates whatever its check
status. That is the design working, not a gap to widen.

This skill is deliberately **tool-agnostic**. It never assumes GitHub or Linear. Resolve the repo
host, base branch, merge strategy, merge gate and issue tracker from **PROJECT.md** in the CONFIG
step, then use the abstract verbs throughout.

---

## 0. CONFIG — resolve from PROJECT.md, don't hard-code

Read `PROJECT.md` at the repo root and resolve, once per run:

- **Repo host + CLI/API** — where PRs live and the command to drive them (e.g. `gh` for GitHub,
  `glab` for GitLab, an API). Wherever this skill shows `gh …`, substitute the project's actual
  host CLI. "PR" = pull request / merge request, whatever the host calls it.
- **BASE branch** — the merge target (from `PROJECT.md`; usually `main`).
- **MERGE strategy** — how the project merges (e.g. `--squash --delete-branch`). Use exactly
  what `PROJECT.md` specifies. Resolve the project's exception for a parent that carries an open
  stacked child as well, where it declares one. STACKED PAIRS states what that exception is for.
- **Tracker + how to call it** — which issue tracker, the scope, and the concrete calls behind
  these **tracker verbs**: `GET_ISSUE`, `SET_STATUS`, `ADD_COMMENT`. Also resolve:
  - **Target state after merge** — the tracker's real state name for "merged/complete"
    (e.g. "Done"). Note: CLAUDE.md §2 says mark Done only when the PR is merged — which is
    exactly this step — but confirm the state name for THIS tracker.
  - **Merge comment policy** — whether to comment on the ticket at merge (default: yes, include
    the PR link + merge commit SHA).
  - **Issue-id format** — how to recognize a ticket id in a PR title/branch/description
    (e.g. `ENG-123`, `PROJ-45`, `#123`).
  - **Dependency signal** — the project's mark for "a blocker of this ticket is still open", and
    the calls that read it, clear it, and list the tickets a given ticket blocks. The post-merge
    sweep reads exactly this field. A project that declares no dependency signal has none to
    sweep: say so once in the run, and never invent one.

Then resolve the **merge gate**, which is what CLASSIFY reads. Take every field from the project's
merge-gate section, never from memory:

- **Green signal** — the exact jobs that must report success, and the command that reads them.
- **Risk-list paths** — the globs that escalate on any match, **and the matcher that resolves
  them**. Use the command the project states for resolving a PR's changed files against the block.
  Note the change types an entry names beside its glob, such as "modified or deleted".
- **Size threshold** — the declared line and file limits for the auto lane.
- **Footprint enforcement** — on or off.
- **Enforcement mechanism** — whether the host enforces the checks server-side, or whether this
  loop is the only thing honouring them.
- **The decision log** — its location and read command come from the workflow file
  (`CLAUDE.md` §7). Do not assume a filename.
- **The independent reviewer** — the `pr-reviewer` skill, which returns the verdict condition 6
  reads.

**If `PROJECT.md` is missing or has no tracker/host mapping**, STOP and collect it — the
"where do you manage issues / where do PRs live?" decision — then record it in `PROJECT.md`
(via the normal ticket + PR flow) and log it in the decision log (`decisions.d/`). Do not guess
a tracker or a
target state name. (This is the same mapping the `issue-loop` skill uses.)

### LANE AVAILABILITY — announce it once, before SETUP

Answer these four questions, and print the answers. `PROJECT.md` answers the first two and the
last one. This session answers question 3. Print them at the top of the run, before any PR is read.

1. Does the project declare a **green signal**? If it does not, the auto lane is **off** for the
   whole run.
2. Does the project declare a **size threshold**? If it does not, condition 5 fires on every PR.
3. Can you **dispatch the independent reviewer as a separate agent**? Two things are required. The
   `pr-reviewer` skill is invocable by name in this session (`CLAUDE.md` §12). You can also dispatch
   a subagent to run it. If either is missing, the auto lane is **off** for the whole run.

   **Match the name, not the exact string.** An entry listed as `<plugin>:pr-reviewer` is the
   `pr-reviewer` skill, and it meets the first requirement (`CLAUDE.md` §12). Never call the skill
   missing because its entry carries a prefix.

   **A PR whose verdict you were handed reads this question the second way.** A session that was
   handed a verdict does not need to dispatch one. The auto lane stays live for exactly those PRs.
   Keep the answer above for every other PR. Print which reading applied, and name the PRs it
   covers. See A RELAYED VERDICT.
4. Does the host **enforce** the checks server-side? Report the project's own answer verbatim.

Then say in one sentence which lanes are live, and why any lane is off.

**Announce a disabled auto lane; never let it fail silently.** An operator watching every PR
escalate must be able to tell a broad risk list from a missing `PROJECT.md` field. The first is
the gate working. The second is a document to fix.

**No green signal ⇒ no auto lane** (`CLAUDE.md` §0). Do not evaluate the auto lane's conditions at
all in that case. Run the whole batch through the escalate lane, and say once that you are doing
so. Autonomy is earned by building the check, and this loop cannot grant a project a tier it has
not earned.

---

## SINGLE-PR MODE — a caller dispatches one pull request

A caller may run this skill against one pull request. The `cycle-manager` skill does so with its C5
brief (scaffold D-6). Enter this mode only when the invocation names one pull request and asks for a
`CYCLE-MERGE-RESULT` block. Every other invocation runs the full loop from SETUP.

**This mode writes to one pull request, its ticket, and the tickets that ticket blocked.** It writes
no commit. It resolves no conflict and makes no repair. A conflict or a defect stops the merge, and
the PR stays open.

Run these steps in order.

1. Read the PR number from the invocation. Stop and report when the invocation names no number, or
   names more than one.
2. Read the verdict block in the invocation under A RELAYED VERDICT, and apply its four rules. Dispatch
   no reviewer. Stop and report when no verdict block is present, because condition 6 is then met.
3. Print one line that names this mode and the steps it skips: SETUP's batch listing and PROBE.
4. List the open PRs once, read-only: `gh pr list --state open --json number,baseRefName,headRefName`.
   Hold this PR, and merge nothing, when one of these three checks finds a hit.
   - **A stacked child.** This PR's base is another open PR's head branch. Hold this PR under
     STACKED PAIRS.
   - **A parent with an open child.** Another open PR's base is this PR's head branch. Retargeting
     that child would write to another PR, so this mode never merges the parent.
   - **A possible lock.** Another open PR changes a file this PR changes. Read that PR's files with
     `gh pr view <num> --json files`. Treat the pair as a possible locked pair under the HARD STOP in
     the escalate lane. Ask in place, and classify nothing.
5. Run CLASSIFY for this PR alone, and print its reason.
6. Run CONFLICT's classification for this PR. Any conflict with BASE stops this mode. Print the class
   and its reason. Resolve nothing, whatever the class.
7. Choose the lane, and run the merge steps only when the lane allows them.
   - **Auto lane**, when CLASSIFY says `auto` and the relayed verdict is `approve`. Steps 1 to 8 of
     AUTO LANE are covered by steps 1 to 6 above. Run AUTO LANE steps 9 to 15 in order.
   - **Escalate lane**, otherwise. Build the review card, print it, and record its question in the
     digest. A contradiction or a destructive action is asked in place instead. Merge only when the
     user's verbatim answer approves this PR under the approval gate in `CLAUDE.md` §6. "Not yet
     approved", silence, and an answer about another PR are not approval. On approval, run AUTO LANE
     steps 9 to 15.
8. Return the block below. Then print the FINAL SUMMARY row and the DIGEST for this PR, in their own
   shapes.

```text
CYCLE-MERGE-RESULT
merged      <this PR number when it merged, or none>
still-open  <this PR number when it did not merge, or none>
queued      <1 when this run queued its question in the digest, otherwise 0>
hard-stops  <this PR number when its question was asked in place, or none>
```

A question is either queued or asked in place, never both. A held stacked child, and a held parent,
count as still-open and queue no question. The `cycle-manager` skill reads this block, so print its
four field names exactly as written.

---

## SETUP (run once)

1. List open PRs targeting BASE:
   `gh pr list --state open --base <BASE> --json number,title,author,createdAt,headRefName,isDraft`
   (substitute the host CLI from CONFIG).
2. **Find the stacked children in a second listing pass.** A stacked child is an open PR whose base
   is another open PR's branch, and not BASE. Step 1's filter cannot see one, so list every open PR:
   `gh pr list --state open --json number,title,author,createdAt,baseRefName,headRefName,isDraft`.
   Keep every PR whose base branch matches another open PR's head branch. Record each pair, by PR
   number and by branch name. Work the pairs under STACKED PAIRS below.

   **Run this pass at every queue size, and treat a missing pass as a stacked child you did not
   find.** Step 1 alone reports a clean sweep over a queue that still holds an invisible PR.
3. Fetch latest: `git fetch origin`.
4. Decide a provisional merge order, one-line reason each:
   - A parent before its stacked child, always (STACKED PAIRS).
   - Foundational/shared changes (schema, shared libs, config) before dependents.
   - Currently-clean PRs before conflicting ones.
   - Smaller before larger, older before newer, when otherwise equal.
   - Skip drafts unless the user says otherwise.
   Do NOT ask for approval of the order yet — refine it in PROBE first.

## STACKED PAIRS — a child never merges before its parent

A **stacked child** is an open PR whose base is another open PR's branch, and not BASE.
`CLAUDE.md` §3 permits that arrangement, and the `issue-loop` skill opens such a PR with
`--base <parent-branch>`. SETUP step 2 builds the pair list. This section says what the loop does
with each pair, and it binds both lanes.

**The base branch is the link between the two PRs, and the issue id is not.** Read the pair from
the PRs. This loop reads PRs before it reads tickets, so a ticket relation resolves too late.

1. **Never merge a stacked child while its parent is open.** This holds in either lane, on any
   verdict, and on any classification. A human approval never releases it either. Name the parent
   by number, say the child waits on it, and move to the next PR.
2. **Offer no merge option on a held child.** You may not perform that merge, so no wording of it
   is available to you (ASK BLOCK). Offer to hold the child until its parent merges.
3. **Merge a parent that carries an open child with a merge commit, and keep its branch.** Use the
   exception CONFIG resolved for this case. The project's ordinary merge strategy governs every
   other PR.

   **Say why, because the ordinary strategy breaks the child.** A squash writes a new commit to
   BASE, and deleting the branch retargets the child. The child's diff then re-includes the
   parent's changes and conflicts with them. A merge commit makes the parent's commits ancestors
   of BASE, so the child's diff stays its own changes alone.
4. **Retarget every child of that parent immediately after the parent merges.** Move the child's
   base to BASE: `gh pr edit <num> --base <BASE>`. Read the result of that call.
5. **Never rebase a child, and never force-push one.** A retarget changes the PR's base, and it
   changes no commit. Item 3 is what makes that enough, so a stacked child needs no rebase and
   the no-force-push rule (private D-77) stands untouched.
6. **Re-run the project's checks on the retargeted child. Read the results yourself.** The child's
   diff is now measured against BASE, so the earlier run proves nothing about it.
7. **Re-run CLASSIFY for the child, on its current head SHA.** Its base moved, so the previous
   classification, any reviewer verdict and any human approval all lapse. This is the lapse
   CONFLICT declares for a resolution, applied to a base change.
8. **Re-present the child on that head SHA.** The escalate lane builds a fresh review card. The
   auto lane needs a fresh verdict from the independent reviewer.
9. **Delete the parent's branch once every child of it is retargeted.** Report a branch you left
   behind, and name the child still holding it.
10. **Report every pair in plain English** (PLAIN-LANGUAGE RULE). Name the parent, name the child,
    and say what the child waits on.

**A child whose parent merged in an earlier run is still a child until it is retargeted.** Its base
names a branch that is merged, or gone. Retarget it under item 4, then work it as any other PR.

**Never merge to resolve a pair you cannot read.** A base branch you cannot match, and a child you
cannot retarget, each stop this loop for that PR. Report it, and move on.

## PLAIN-LANGUAGE RULE (applies to every line you present to the user)

Write every line the user reads in plain English. Assume the user is NOT deep in the code. Assume
the user has never read `CLAUDE.md` §6.

**The rule covers everything you present, not only the PR summary.** It covers the escalation
reasons, the findings, the blockers, the conflict classifications, the lock statements, the sweep
results, the risk map, the auto lane's report of a merge it made, the final summary, and every
question you ask.

### Summarizing a PR

- Lead with the effect on the product/user, not the implementation. "Users can now reset their
  password from the login screen" — not "adds a POST /auth/reset handler with a token TTL."
- Spell out or avoid jargon. If a term is unavoidable (migration, grant, RLS, webhook), add a
  half-sentence of what it means in this context.
- Say WHY it exists — the problem it fixes or the thing it enables — when the diff makes that clear.
- State what visibly changes and what the user would notice if it broke.
- Keep it to three bullets or fewer, one sentence each. Spend one of them on an analogy when the
  change is hard to picture. The review card states the same cap (ESCALATE LANE).
- If you genuinely can't tell what a PR is for, SAY SO plainly rather than dressing it up —
  "I can't tell what problem this solves; the diff only does X" — so the user knows to ask the author.

### Stating a finding

Write a finding as a sentence about this PR. Say what you observed. Say what it means for this
merge. Name the file, the job, the ticket or the branch the observation came from.

- No: "Condition 2 fired."
- Yes: "The CI run reported no result for this branch, so nothing has checked this change
  (escalation condition 2)."
- No: "Strays outside the declared footprint."
- Yes: "The PR edits the release script, and issue #96 did not list that file as one it
  would touch (escalation condition 3)."
- No: "Pre-merge check 7: stale."
- Yes: "The PR body still describes replacing one lint pattern, and the diff now adds a second one
  instead (pre-merge check 7, body freshness)."

### An identifier is never the whole explanation

Cite the identifier. Never present it alone. This holds for an escalation condition, a pre-merge
check, a conflict shape, a disqualifier, a decision id, and a `CLAUDE.md` section.

1. Write the plain sentence first. It carries the meaning.
2. Put the identifier after it, in brackets, as the citation.
3. Rewrite any line where the identifier is doing the explaining.

**Keep every identifier you had before.** The sentence is the requirement and the identifier is the
audit trail, so a reader can still trace any stop back to the rule that produced it. This rule
reorders the two. It deletes neither.

### Gloss the loop's own vocabulary

The PR summary rule already glosses product jargon. Gloss the loop's own terms the same way: add a
half-sentence of meaning the first time each one appears in a presented line.

| Term | Gloss to use in a presented line |
| --- | --- |
| footprint | the files the issue said this change would touch |
| green signal | the checks this project requires to pass before a merge |
| BASE | the branch this PR merges into |
| head SHA | the exact commit this PR would land right now |
| dependency signal | the tracker's mark for "a blocker of this ticket is still open" |
| sweep | clearing that mark from the tickets the merged one was holding up |
| lock | a hold on two PRs that contradict each other, until you rule on which wins |
| lane | whether an agent may merge this PR alone, or the user decides |
| classification | the loop's reading of which lane a PR belongs in, and why |
| stacked child | a PR built on another open PR's branch, which cannot merge until that one does |
| mechanical conflict | both sides are right, and the file's own format says how to combine them |
| intent conflict | the two sides want opposite things, and only the user can choose |

Use the project's own words for anything `PROJECT.md` names. Never invent a second term for a
concept that already has one.

## ASK BLOCK (close every stop with one)

Every stop ends with an ASK block. The stops are the PROBE order approval, the locked-pair ruling,
an `intent` conflict, a repair hand-off, the review card, and the FINAL SUMMARY. A stop without an
ASK block is a stop the user cannot answer.

**The FINAL SUMMARY is the one stop that may end without one.** A run that left nothing waiting on
the user has no decision to ask about, and a question invented to fill the slot is noise. Every
other stop is a decision request by definition, so its ASK block is never optional. See FINAL
SUMMARY.

**The PROBE order approval is not a stop at a queue of one open PR.** One PR has one order, so the
phase reaches no order decision and ends with no ASK block. That is the only case the PROBE stop
does not occur, and PROBE itself still runs. See the queue-size rule in PROBE.

Print these parts, in this order, and nothing else:

1. **The question** — one sentence, ending in a question mark. Ask about one decision only.
2. **Already tried** — one line: what the run already did about this item, such as a repair, a
   conflict resolution or a re-run check. Leave the line out when the run tried nothing. A block
   without it says the run tried nothing.
3. **The options** — each one names what the user says, and what that answer causes. Put the
   recommended option first. Give the reason it is recommended.
4. **Blocked until you answer** — what the loop will not do while it waits, by PR or ticket id.

Keep the evidence above the block. Never put a new finding inside it.

**The tried line carries what `CLAUDE.md` §13 requires of every queued entry.** The DIGEST re-prints
the block alone, so a fact kept only above the block never reaches the digest. Keep it to one line.

```text
ASK — <one-sentence question?>

  Already tried: <one line — leave it out when the run tried nothing>

  A) "<what you say>"  (recommended — <why>)
     → <what happens next>
  B) "<what you say>"
     → <what happens next>

  Blocked until you answer: <what waits, by PR or ticket id>
```

**One decision per ASK block.** Never compound two questions into one. A PR that needs a lock
ruling and a merge approval asks for the lock ruling, then stops. Ask the second question after the
user answers the first.

**Recommend an option, and say why.** A recommendation the user can overrule costs nothing. An ask
with no recommendation hands back the reasoning the loop already did.

**Never offer a merge you may not perform, and never recommend one.** Leave the option out
altogether. A listed option is a path the user can pick, so a guard that bars only the
recommendation leaves that path open. A PR you authored, a locked pair and an `intent` conflict
each carry this bar.

**On a PR you authored, offer a hand-off instead of a merge.** You may not merge it on any verdict,
so no wording of the merge option is available to you. **You cannot obtain a verdict on it either.**
The `pr-reviewer` skill requires a reviewer to refuse an invocation from the branch's
author, and that refusal survives one level of indirection. Never offer to fetch a verdict you
cannot get. Offer to hand the PR off to a session that did not write it, and offer to skip it. Say
plainly that you cannot merge this one yourself, and why. The user may still merge it by hand, which
is theirs to do and never yours to perform. The escalate lane states the same bar and shows the
block.

**Write every line of the block under the PLAIN-LANGUAGE RULE.** The question is the line the user
reads first, and a question stated in the gate's vocabulary is a question they cannot answer.

**A queued block is still an ASK block.** The review card's block, and an `intent` conflict's block,
go into the escalation queue and the DIGEST re-prints them at the end of the run (`CLAUDE.md` §13).
The shape above never changes, and you never rewrite a block to shorten the digest.

**Two blocks are never queued.** Ask a locked-pair ruling in place, and wait. Ask a destructive
action's confirmation in place, and wait. Both are hard stops (`CLAUDE.md` §13).

## PROBE (run once, BEFORE any merging)

Purpose: read the WHOLE batch as a set so cross-PR problems surface up front, not at each card.
This phase is **read-only**. It merges nothing and touches no ticket.

### The queue-size rule — apply it before step 1

Count the open PRs once, before you read the first diff. That count is the **queue size**, and it
sets which steps run.

- **Two or more open PRs:** run every step below, in full.
- **Exactly one open PR:** run steps 1, 2 and 4. Skip step 3. Skip step 5. Skip step 6.

**PROBE always runs. Only its cross-batch steps degenerate.** Never read this rule as licence to
skip the phase. The threshold is **2**, and it is the smallest queue that holds a pair.

**Why the cross-batch steps degenerate at a queue of one.** Each thing they look for needs a pair.
A semantic conflict, a duplicate, an ordering hazard and a file-level overlap are all relations
between two PRs. One PR has no pair, so those steps find nothing by arithmetic. At two open PRs
they run in full, because PROBE is the only detector for a semantic conflict between PRs that
touch no common file (private D-26, ruling (c)).

**Steps 1, 2 and 4 are per-PR work, so they never degenerate.** Step 1 reads each diff, and
CLASSIFY and the review card need those diffs at every queue size. Step 2 writes each PR's own risk
note. Step 4 checks each migration against the live schema, and a lone migration still drifts.

**Print one line naming the queue size and every step it skipped.** Print it where the risk map
would go, so the reader sees what did not run:

```text
PROBE degenerated at a queue of 1 open PR: skipped step 3 CROSS-DIFF PASS, step 5 RISK MAP and
REVISED merge order, and step 6 CONFLICT-PAIR LOCK LIST. Steps 1, 2 and 4 ran.
```

1. Read every open PR's diff (`gh pr diff <num>` for each). Don't rely on filenames/metadata alone.
2. Per-PR quick risk note: what it does, migrations/env/deps/infra touched, obvious runtime or
   logic blockers (bad API params, drop/backfill hazards, unguarded failures).
3. **CROSS-DIFF PASS** (cross-batch — skipped at a queue of one) — look at the diffs together, not
   one at a time. Explicitly flag:
   - **Semantic conflicts:** two PRs that undo, reverse, or contradict each other even if they
     don't touch the same lines (one adds a grant another removes; one re-introduces a value
     another deletes).
   - **Duplicate/competing changes:** two PRs implementing the same thing differently.
   - **Ordering hazards:** PR B only works if PR A merged first (or breaks if A merges after).
   - **File-level overlaps** that will conflict once one side merges.
4. **SCHEMA CHECK** (only if `PROJECT.md` says the project has a database): for every PR with a
   DB migration, cross-reference the migration against the **LIVE** schema (query the actual
   DB — via the project's DB tooling in `PROJECT.md`), not just against other PRs. Flag drift:
   columns/tables the migration assumes exist but don't, or objects it would create/drop that
   clash with current state. Call out anything needing manual action from the user. (If the
   project has no database, skip this step and say so.)
5. Produce a **RISK MAP** (cross-batch — skipped at a queue of one): a table of all PRs with — a
   ONE-LINE PLAIN-ENGLISH summary (see PLAIN-LANGUAGE RULE), status (clean / needs-action /
   blocked), the specific blocker if any, cross-PR dependencies, and a note if it should be held or
   reordered. Then give a **REVISED merge order** informed by everything above. At a queue of one,
   print step 2's one-line plain-English risk note for that PR instead. **Never print an empty
   table, and never print a one-row one.**
6. **BUILD THE CONFLICT-PAIR LOCK LIST** — cross-batch, skipped at a queue of one. From the
   semantic-conflict and duplicate/competing findings in step 3, record every conflicting pair
   (or group) as LOCKED. State the lock in plain
   English: name both PRs, say what each one wants, and say why both cannot hold at once. List each
   locked pair explicitly in the risk map. State that BOTH sides are blocked from merge until the
   user rules.

Present the risk map, the locked pairs and the revised order. Then close with one ASK block on the
order, and **WAIT for the user's answer**. If the user does not answer on the order, proceed with
the revised order.

**At a queue of one, end PROBE with no ASK block.** One PR has one order, so no order decision
exists. Print the degeneration line and the step 2 risk note, then go to CLASSIFY. An ASK block
here would stop the run for a question the user cannot decide anything with.

**Ask about each locked pair separately, after the order is settled.** One decision per ASK block,
so an order approval and a lock ruling are never one question. NEVER auto-resolve a locked pair.
A lock stays until the user explicitly rules, and "defer" is a valid answer that keeps it.

```text
ASK — Shall I work the PRs in this order: #133, #117, #140?

  A) "ok"  (recommended — it merges the shared config change first, so the two PRs
     that build on it stop conflicting)
     → I start reviewing #133 and bring you a card for it.
  B) "<your own order>"
     → I use your order instead and start with the PR you name first.

  Blocked until you answer: nothing. I proceed with this order if you say nothing.
```

**PROBE is mandatory, and it stays read-only.** It runs before CLASSIFY and before either lane, at
every queue size. A queue of one degenerates its cross-batch steps and skips none of the phase.
A locked pair is never auto-merged, whatever its classification.

**PROBE records a conflict. It resolves none.** Resolving is a write, and this phase writes
nothing. Carry every conflict it found into CONFLICT, which runs after CLASSIFY.

## CLASSIFY (run once, after PROBE, before the first card)

Sort every PR into a lane. The conditions come from `CLAUDE.md` §6, and they are predicates you
**check**, not risks you weigh. Evaluate them against the diff, the check results and the ticket.

### Three gates first — any one sends the PR to the escalate lane

1. **Authorship.** Did you write any commit on this branch? Include earlier sessions in that
   answer. Classify `escalate` if the answer is yes. Classify `escalate` if you cannot tell.
2. **Lock.** Is this PR part of an unresolved locked pair from PROBE? Classify `escalate`, and
   hold it under the HARD STOP in the escalate lane.
3. **A repair record you wrote.** Does the PR carry a repair comment? Read the PR's comments to
   answer this. Never infer it from the commit list, which cannot separate one agent from another.
   Then ask who wrote that repair. Classify `escalate` when this run wrote it. Classify `escalate`
   when you cannot tell who wrote it. A record another agent wrote fires no gate on its own, and the
   remaining conditions decide the lane (`CLAUDE.md` §6).

### The escalation conditions

Record the PR's head commit SHA before you start. The classification belongs to that SHA.

1. **Risk-list path.** Resolve the changed files against the risk-list globs, using the matcher
   and the command CONFIG resolved. Name every file that matches. A green signal does not clear
   this condition. A project that names no matcher makes this condition unevaluable, so it fires.
   Where a matching entry names change types, read each file's change type:
   `git diff --name-status --no-renames origin/<BASE>...<SHA>`. That form lists a rename as a
   deletion and an addition. A file whose change type the entry does not name clears this entry.
   An entry that names no change type covers every change type. Treat an unreadable change type as
   covered (`CLAUDE.md` §6).
2. **Green signal not green.** Read the check results (`gh pr checks <num>`). This condition fires
   on any required job that fails, is pending, is cancelled, or never reported.
3. **Footprint stray.** Evaluate this condition only where CONFIG found footprint enforcement on.
   Read the declared footprint from the ticket. Name every changed file outside it. This condition
   fires when enforcement is on and the ticket declares no footprint.
4. **A test deleted, skipped or weakened.** Search the diff for removed test files, removed
   assertions and skip markers. Search it for an updated snapshot or expected-output fixture. Search
   it for a loosened threshold, tolerance or timeout. Each one fires this condition. A snapshot
   update the PR body explains still fires it, so a human reads the explanation. No issue's
   instructions override this condition (`CLAUDE.md` §11 rule 10).
5. **Size threshold.** Read the numbers from the host rather than counting them
   (`gh pr view <num> --json additions,deletions,changedFiles`). Compare them against the declared
   threshold. An undeclared threshold fires this condition by default.
6. **The independent reviewer's verdict.** The auto lane evaluates this condition, as its first
   step. See the note below.
7. **A stale record: the ticket, the PR body, or a newer decision.** Re-read the ticket and every
   comment on it. Read the decision log for entries dated after the branch point. Read the PR body
   against the current diff. This condition fires on a ticket that was cancelled, descoped or
   superseded. It fires on a decision entry that touches what this PR changes. It fires on a body
   that describes a superseded version of the change — never record that as a finding and pass the
   PR on.
8. **An effect a revert cannot undo.** Ask whether a revert of this commit returns the system to
   its prior state, with no action needed outside the repository. This condition fires when it does
   not. Read the diff for each shape `CLAUDE.md` §6 names: data deleted or an irreversible
   migration, a message sent to a person, money moved or spend incurred, a credential rotated or
   published, an external resource destroyed. Name the hunk. A diff that touches no risk-list path
   can still fire this condition.

**The tie-break is fixed.** A condition you cannot evaluate counts as met. Never record such a
condition as clear, and never record it as not applicable.

### No checks reported is RED

Condition 2 fires when the host reports **no checks at all**. Treat that as red, never as "nothing
to fail". A repository with no CI would otherwise auto-merge everything, which is the exact
inversion this rule exists to prevent.

Two states look identical on one reading, and they are not the same thing:

- **No checks configured** — a durable state. `PROJECT.md` declares no green signal. The auto lane
  is off for the whole run, per LANE AVAILABILITY.
- **No checks reported yet** — a race. The host registers runs a few seconds after a push, so a
  green PR reports an empty set for about a minute.

**Re-poll once before you conclude the set is empty.** Wait about a minute, then read the checks
again. Classify `escalate` if the set is still empty. A single empty reading is not evidence.

### The seven pre-merge checks still apply

`CLAUDE.md` §6 applies all seven pre-merge checks to every PR, in both lanes. Only the signer
changes. The independent reviewer performs them in the auto lane. CLASSIFY, the review card and the
user perform them in the escalate lane. Neither lane skips them.

**Check 7 is body freshness, and this loop is where it bites.** A PR amended after its body was
written keeps describing the change it used to be, and that description is what merges. Read the
body against the current diff, in both lanes. Report the outcome on the review card.

### Print the classification table

Print one row per PR, including every PR classified `auto`:

| PR | Lane | Conditions fired | Reason |
| --- | --- | --- | --- |
| #NN | escalate | 1, 5 | It edits `CLAUDE.md`, which this project always sends to a human. It also changes 180 lines, over the 50-line limit for an unattended merge. |
| #NN | auto | none | It changes 12 lines under `tests/` only, every check passed, and it touches nothing outside the files its issue named. |

**Write the Reason cell as a plain sentence.** The Conditions column carries the numbers, so the
Reason column carries the meaning. A cell reading "condition 1, condition 5" repeats the column
beside it and explains nothing (PLAIN-LANGUAGE RULE).

**Print the reason for an `auto` row too.** Name the conditions you checked and cleared. A
classifier whose decisions are invisible cannot be audited, and an invisible classifier is how a
wrong lane goes unnoticed.

**A PR classified `auto` has not yet cleared condition 6.** The classification is provisional. It
authorises nothing on its own, and the auto lane's first step is the verdict that completes it.

**A conflict fires none of the eight conditions.** A conflicting PR can therefore classify `auto`.
Run CONFLICT for every PR that conflicts with BASE, before either lane acts on that PR.

## CONFLICT — run for any PR that conflicts with BASE

Run this phase after CLASSIFY and before either lane acts on the PR. Run it whenever the host
reports the PR as not cleanly mergeable against BASE.

**Most conflicts are not a disagreement.** Two branches add an entry to the same directory. One
side reformats a paragraph the other side edits. Both sides make the same fix. There is no winner
to pick, and sending those to a human buys no safety.

**A minority are the real thing.** Two tickets want opposite outcomes in the same place, and git is
only where that becomes visible. An agent resolving one of those picks a winner between two
intents. It produces something plausible either way, including when it picks wrong. This phase
exists to separate the two cases, and to keep protecting the second.

### Two gates first — either one forbids a resolution

1. **Lock.** Is this PR part of an unresolved locked pair from PROBE? Do not classify its conflict.
   Do not resolve it. Hold it under the HARD STOP in the escalate lane until the user rules.
2. **Authorship.** Did you write a commit carrying this PR's own work? Do not resolve its conflict.
   Report the conflict, and let the escalate lane present it. Answer `yes` if you cannot tell.

### Read every hunk before you classify anything

1. `git fetch origin`.
2. Read the merge state: `gh pr view <num> --json mergeable,mergeStateStatus`.
3. Cut a scratch worktree from the PR's head ref. Never do this work in your own checkout.
4. Merge BASE into the scratch worktree: `git merge origin/<BASE>`.
5. List the conflicting files: `git diff --name-only --diff-filter=U`.
6. Read every conflicting hunk in every conflicting file. Read the whole hunk, not the markers.

**One `intent` hunk makes the whole conflict `intent`.** A conflict is `mechanical` only when every
hunk in every conflicting file is mechanical. Never resolve part of a conflict and escalate the
rest.

### `mechanical` — the three shapes

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

### Disqualifiers — any one makes the hunk `intent`

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

### `intent` — everything else, and it is the default

Classify a conflict `intent` when any hunk matches no shape. Classify it `intent` when any
disqualifier fires. Classify it `intent` whenever you are unsure.

**A conflict you cannot classify is `intent`.** Absent evidence is not evidence of safety
(`CLAUDE.md` §6). Uncertainty is never resolved by resolving.

### RESOLVE a `mechanical` conflict — on the branch, never inside the merge

1. Resolve each hunk by the shape that matched it. Add nothing the two sides do not already say.
2. Run the project's checks in the scratch worktree, if its commands run in this environment.
3. Commit the resolution on its own. Name the PR and the classification in the message.
4. Push to the PR's branch: `git push origin HEAD:<headRefName>`.
5. Never force-push. Never push to BASE. A resolution is a commit on the branch, and only there.
6. Wait for the project's checks to report on the new head SHA. Read the results yourself.
7. Escalate the PR and stop if any check fails. Do not resolve again. Do not revert.
8. Re-run CLASSIFY for this PR. The head SHA moved, so the previous classification is void.
9. Remove the scratch worktree.

**State why the resolution goes on the branch.** A conflict resolved inside the merge lands a diff
that no review saw and no check ran on. Resolving on the branch keeps the property that what merges
is what was reviewed. `CLAUDE.md` §6 pre-merge check 4 already requires exactly this on a stale
branch — merge BASE in, resolve, re-run the suite — and this phase defines the boundary that check
cites.

**Merge BASE in. Never rebase.** A rebase needs a force-push, which destroys the commits a reviewer
already read. A merge commit also keeps the resolution readable on its own.

**A risk-list path does not block a resolution.** Condition 1 still escalates the PR, so a human
reads the resolved diff before it merges. Resolving a mechanical conflict changes no intent and
removes no gate.

### A resolution voids every approval the PR already carried

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

**A resolution commit does not make you the PR's author.** The authorship gate asks whether you
wrote a commit carrying the PR's own work. A mechanical resolution carries none, which is what the
classification asserts. The exemption covers a resolution commit you pushed under this phase, and
nothing else. Escalate the PR when you cannot tell your resolution commit apart from your other
commits on that branch.

### ESCALATE an `intent` conflict — name both sides, pick no winner

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

### Print the conflict table — mechanical rows included

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

## REPAIR — fix a defect on the branch, then hand the PR off

Run this phase after CONFLICT and before either lane acts on the PR. Run it for any PR where
CLASSIFY, CONFLICT or PROBE found a defect on the repairable list below, whatever lane the PR was
classified into.

**Reporting a defect and handing the PR back to its author costs a whole session.** The author's
loop has to be scheduled again for a failing lint job, or for one sentence in a PR body. This phase
fixes it here instead, and pays one price for that: a repair makes you the branch's author, so you
never merge that PR (`CLAUDE.md` §6). A later session that did not write the repair merges it.

### Two gates first — either one forbids a repair

1. **Lock or `intent` conflict.** Is this PR part of an unresolved locked pair, or did CONFLICT
   classify its conflict `intent`? Do not repair it. Hold it under the HARD STOP in the escalate
   lane until the user rules.
2. **Authorship.** Did you write a commit carrying this PR's own work? Do not repair it. The
   hand-off block in the escalate lane applies unchanged. Answer `yes` if you cannot tell — a
   repair stacked on your own work is a repair you can never separate from it again.

### Repair only these five, and name the one you are repairing

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

### Never repair these — none of them is a defect

| Finding | Why it is not repairable |
| --- | --- |
| A risk-listed path (escalation condition 1) | The PR is correct. The condition asks a human to look. |
| A footprint stray (condition 3) | Reverting it, or widening the issue, is a scope decision. |
| A test deleted, skipped or weakened (condition 4) | `CLAUDE.md` §11 rule 10 sends this to a human, always. |
| A diff over the size threshold (condition 5) | Splitting a PR decides scope on the user's behalf. |
| A cancelled ticket, or a contradicting decision (condition 7) | Only the user can say what the project now wants. |
| An effect a revert cannot undo (condition 8) | Removing the effect changes what the PR does, which is a scope decision. |
| An `intent` conflict, or a locked pair | Both sides want opposite things, and picking one is the user's call. |
| A PR whose own work you authored | You could never separate your repair from your own work again. |

**Escalate the finding instead, and say what you would have changed.** A finding you cannot place
on either list is not repairable. Absent evidence is not evidence of safety (`CLAUDE.md` §6).

### The bounds — every one holds on every repair

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
   manufacturing a footprint stray.
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
   success. Never repair again to chase a red check.
10. **Re-run CLASSIFY against the new head SHA.** The diff moved, so the classification, any
    reviewer verdict and any human approval all lapse — the same lapse CONFLICT declares for a
    resolution.
11. **Send the PR to the escalate lane for the rest of the run**, whatever that fresh
    classification says, and close it with the hand-off block below. You wrote this repair, so you
    are the branch's author and this run never merges that PR. A later run that wrote nothing here
    reads the record differently (AUTO LANE).
12. **Remove the scratch worktree.**

### Leave the record — the next session reads it, not your memory

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

### Then hand the PR off

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

### Print the repair table

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

## REVIEW RECORD (post it in both lanes, before the PR merges)

`CLAUDE.md` §6 requires one comment on the PR carrying the outcome of pre-merge checks 2–5 and 7.
That comment is the only valid surface, and this phase is where the loop writes it. Both lanes run
this phase. Neither lane merges a PR whose record is not posted.

Post the record as soon as you hold all five outcomes for this PR. The auto lane holds them once it
reads the reviewer's verdict. The escalate lane holds them once it reconciles the card. **Post the
record even when the PR does not merge.** A PR the user skips was still reviewed, and this comment is
the only thing that says so.

Head the comment `MERGE-LOOP REVIEW RECORD` and give it one line per check:

```text
MERGE-LOOP REVIEW RECORD — head <SHA> — lane: <auto | escalate>
  2 decision freshness  <clear | fired> — <what you read>
  3 duplicate           <clear | fired> — <what you read>
  4 staleness vs BASE   <clear | fired> — <what you read>
  5 ticket valid        <clear | fired> — <what you read>
  7 body freshness      <clear | fired> — <what you read>
Bottom line: <one plain sentence naming what decides this merge>
Independent verdict: <the reviewer's verdict and where its comment is, or `none — escalate lane`>
```

Five rules bound the record:

1. **Name the head SHA the record belongs to.** A record naming no commit describes no diff.
2. **Write every line under the PLAIN-LANGUAGE RULE.** A check number cites; it never explains.
3. **Post one record per head SHA.** A moved head gets its own record.
4. **Never edit an earlier record, and never delete one.** A later record that corrects an earlier
   one says which one it corrects.
5. **Report a record that failed to post.** Merge nothing until that record lands.

**A record you could not post stops the merge, in both lanes.** The record is the evidence that this
review happened, so merging without it is merging on evidence you could not write. Never merge to
resolve that uncertainty (`CLAUDE.md` §6).

**This record is not the repair record.** REPAIR's comment says what an agent changed on the branch.
This one says what the review found. A PR can carry both, and one never substitutes for the other.

## AUTO LANE (for each PR classified `auto`, in the approved order)

1. Re-fetch BASE: `git fetch origin`.
2. Re-read the head commit SHA. Re-run CLASSIFY for this PR if the SHA moved.
3. Run CONFLICT if this PR conflicts with BASE. Re-enter the lane its fresh classification names.
4. **Dispatch one subagent to run the `pr-reviewer` skill on this PR.** The reviewer is a separate
   agent, never this context. Pass the PR number, BASE, and the head commit SHA the verdict belongs
   to. A reviewer that runs in your context is you, whoever wrote the branch. **Dispatch nothing
   when the invocation already carries a verdict block.** Accept that verdict instead, under
   A RELAYED VERDICT below.
5. Read the first line of the verdict you now hold.
6. Move this PR to the escalate lane on anything other than `approve`. Print the verdict there.
7. Stop and report if the reviewer did not run. A missing verdict is condition 6 met. A dispatch you
   could not make reads the same way: condition 6 met, stop and report. Never read it as a missing
   skill. Never work around the absent verdict. **A verdict you accepted under A RELAYED VERDICT
   satisfies this step.**
8. Never review the PR yourself instead. You are the merging agent, not the independent one.
9. **POST THE REVIEW RECORD on this PR.** Run the REVIEW RECORD phase above. Merge nothing before
   that comment posts.
10. Merge this PR on `approve`: `gh pr merge <num> <MERGE strategy>` (from CONFIG). Merge a PR that
    carries an open stacked child with a merge commit instead, and keep its branch (STACKED PAIRS).
11. Capture the resulting merge/squash commit SHA on BASE.
12. `SET_STATUS` on the resolved issue id → the target state from CONFIG.
13. `ADD_COMMENT` with the PR URL and the merge commit SHA, if the comment policy is on.
14. Merge only, and say "no tracker update (no ticket linked)", when no issue id resolves.
15. **SWEEP THE DEPENDENTS** of the merged ticket. Run the DEPENDENT SWEEP below.
16. **RETARGET EVERY OPEN CHILD** of the PR you just merged. Run items 4 to 9 of STACKED PAIRS.
17. `git fetch origin` so BASE is current.
18. **RE-CHECK THE RISK MAP.** This merge may have activated a flagged semantic conflict or a
    schema dependency for a later PR. Call it out now, and reorder the remainder if needed.
19. **Print a WHAT IT DOES block for the merged PR, and print it first.** Build it in the shape the
    review card defines, with its `Action items:` line (ESCALATE LANE).
20. Print the lane, the verdict, the merge SHA, the tracker result and the sweep result. Then
    continue.

**The plain-English block goes above the mechanical fields.** A reader who stops after three lines
learns what merged, rather than which commit it landed on.

**An auto-merged PR is reported in plain English, exactly as an escalated one is.** Nobody watched
this merge happen, so this report is the only account of it. The PLAIN-LANGUAGE RULE covers the
report, as it covers every other line you present (private D-96).

**The verdict expires when the diff changes.** It belongs to the head SHA the reviewer read. Treat
a new commit, a rebase, or a BASE move that changes what would land exactly as `CLAUDE.md` §6
treats a lapsed human approval: re-classify the PR, and get a fresh verdict.

**Never merge to resolve uncertainty.** A failed merge call, a tracker error, or a verdict you
cannot read stops this lane for that PR. Report it and move on. Do not retry blindly. A conflict
goes to CONFLICT first, and stops this lane whenever CONFLICT classifies it `intent`.

**Never merge a PR you authored, on any verdict.** The authorship gate in CLASSIFY has already
escalated it. Do not re-enter the auto lane through a second reading of the same PR.

**Never merge a stacked child while its parent is open, on any verdict** (STACKED PAIRS). Hold the
child, name the parent, and move to the next PR. The child re-enters this lane after the parent
merges, after its retarget, and on a fresh verdict covering its new base.

**A PR carrying a repair record you wrote never enters this lane.** CLASSIFY's third gate has
already escalated it, and REPAIR sends a PR this run repaired to the escalate lane whatever the
fresh classification says.

**A repair another agent wrote does not bar this lane** (`CLAUDE.md` §6, the repair block). The bar
here is authorship, not the record. Verify these three before you merge such a PR, and assume none
of them:

1. The verdict from step 5 belongs to the repaired head SHA.
2. The repair stayed inside the five repairable shapes REPAIR lists, and inside the issue's declared
   footprint. Read the repair comment for both.
3. Every other escalation condition cleared on its own.

**Escalate the PR when you cannot verify any one of them.** Absent evidence is not evidence of
safety (`CLAUDE.md` §6).

### A RELAYED VERDICT — accept the one your caller already holds

Your caller may hand you a verdict it obtained itself. Accept that verdict, and dispatch no
reviewer. The block is the verdict the `pr-reviewer` skill returns, unchanged. That skill's RETURN
THE VERDICT section owns the shape (scaffold D-5). The block arrives like this:

```text
VERDICT       <approve | escalate | reject>
PR            <N>
HEAD          <SHA the verdict belongs to>
INDEPENDENCE  <what the reviewer established, from its own INDEPENDENCE phase>
FINDINGS
  <the reviewer's findings, unchanged>
ADVISORY      <the reviewer's non-blocking notes, unchanged>
```

- **`FINDINGS`** is a block. It is every indented line beneath the `FINDINGS` line, down to the
  `ADVISORY` line.
- **Never relay `ADVISORY` to a repairer.** A note is never a finding. The `cycle-manager` skill's
  C3 never carries it either.

Read a relayed verdict under these four rules, in order.

1. **Read the PR's current head commit SHA yourself, from the host.** Never take that SHA from the
   invocation. The caller's copy is the claim you are checking.
2. **Treat the verdict as void when the current head does not equal its `HEAD` field.** Stop, and
   report both SHAs. A void verdict authorises nothing. Never merge to resolve that uncertainty
   (`CLAUDE.md` §6).
3. **Read the `INDEPENDENCE` field.** Three readings stop this lane: an absent field, independence
   not established, and a reviewer that authored the branch. Stop and report on any of them. Each
   one is condition 6 met. The `pr-reviewer` skill writes that field in its own INDEPENDENCE phase,
   whichever way the phase went.
4. **Read the `VERDICT` field last.** Act on it exactly as you act on a dispatched verdict. Anything
   other than `approve` moves this PR to the escalate lane.

**A relayed verdict is evidence, and an unreadable field is absent evidence.** The fail-closed bias
governs it like every other input.

**Relaying moves who dispatches the reviewer, and nothing else** (private D-155). The verdict
still comes from a separately dispatched agent. A caller that produced the branch cannot supply one.

## ESCALATE LANE — FOR EACH PR, in the approved order

A PR arrives here from CLASSIFY, or from the auto lane after a non-approve verdict. Open its card
with the BOTTOM LINE — one plain sentence saying what you believe and what decides this merge. Cite
the conditions after that sentence, never instead of it (PLAIN-LANGUAGE RULE).

**A PR handed back by the auto lane keeps both readings.** Its card restates CLASSIFY's findings and
prints the reviewer's verdict beside them, per AUTO LANE step 6. Substitute your own reading for
neither.

**FIRST, check the lock list:** if this PR is part of an UNRESOLVED locked pair/group, do NOT
present it for merge. State the lock in plain English: name the other PR, say what each PR wants,
and say why both cannot hold. Then close with one ASK block asking which PR wins. **Never queue a
lock ruling** (`CLAUDE.md` §13): ask it here, and merge neither PR until the user rules. Skip to the
next unlocked PR until the user rules. (See LOCK RESOLUTION.)

```text
ASK — #133 and #117 undo each other. Which one should the project keep?

  A) "#133 wins"  (recommended — it is the newer change, and it matches private D-70)
     → I review #133 the normal way and bring you a card for it. #117 stays open,
       untouched, until you say what to do with it.
  B) "#117 wins"
     → The same, with the two PRs swapped.
  C) "defer"
     → Both stay on hold and I move to the next PR.

  Blocked until you answer: #133 and #117. Neither merges, and neither ticket changes.
```

If this PR is clear of locks (or the lock has been resolved in its favor), **check that the
classification is still fresh** before you build the card. The card is built from CLASSIFY's
findings, so a classification that no longer describes the commit builds the wrong card.

1. Re-read the PR's head commit SHA. Compare it against the SHA CLASSIFY recorded.
2. Re-fetch BASE (`git fetch origin`). Check whether BASE has moved since the classification.
3. Re-run CLASSIFY for this PR when either one has moved. Build the card from that fresh
   classification.
4. Re-read the diff under that same trigger. Never trust the PROBE snapshot in place of that fresh
   reading. A BASE move changes diffs, conflicts and schema state alike.
5. Keep the classification you already hold when the head SHA is unchanged and BASE has not moved.

**An unchanged head SHA and an unmoved BASE authorise no re-gather.** The card restates in that
case, and it never becomes a second classifier reading one commit twice.

Then present a **review card**:

Write every line under the PLAIN-LANGUAGE RULE. The card is a decision request, so the user reads
all of it, not only the summary.

### The card has three blocks, printed in this order

Print **DECISION**, then **WHAT IT DOES**, then **EVIDENCE**. Separate each block from the next with
one blank line. Close with the ASK block below, and print nothing else. The order is fixed so that a
user who stops after two lines still knows what you believe and what decides the merge.

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

**Restate these six, in this order.** Give each one sentence. The card restates the findings
CLASSIFY, CONFLICT and PROBE already produced. Re-gather a finding only under the freshness trigger
above. Each item names the escalation condition or the pre-merge check it discharges. An item that
discharges neither is marked **the card's own work**.

1. **Checks** (escalation condition 2) — restate what CLASSIFY read. Clear when every required check
   passed. Otherwise name the job, and say whether it failed or never reported.
2. **Conflict against current BASE** (pre-merge check 4, staleness against BASE) — restate what
   CONFLICT found. Clear when the merge is clean. Otherwise name the conflicting files, and report
   CONFLICT's classification and its reason. Name the hunks for a resolved conflict, and say what
   changed. Name both sides for an `intent` conflict, and hold the card for the ASK block in
   CONFLICT.
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

**A restated finding that contradicts this PR's row in the classification table is a STOP.** Print
both readings. Name the disagreement in plain English. Report it, and pick neither. Merge nothing on
either reading. Two readings of one commit cannot both be right, and choosing between them is
merging to resolve uncertainty, which this file forbids in both lanes.

**Collapse the evidence that carries no finding.** Give a bullet to each of the six that carries a
finding. Name every one that does not on a single `Clear:` line, each with its answer in a few
words. Print that line last in the block. Omit it when all six carry a finding. **Never drop a
finding to save a line.**

### The card has a length budget

Check these numbers before you print:

- The whole card above the ASK block: **25 lines or fewer.**
- The plain-English summary: **at most three bullets, one sentence each.**
- Every escalation reason, and every evidence bullet: **one sentence, on one line.**
- The BOTTOM LINE: **one sentence.**

Count the lines you print, and count each blank separator as one. A line that wraps on the reader's
screen is still one line. Cut words to come in under the budget. **Never cut a finding, and never
trade a plain sentence for a condition number.** Brevity buys back nothing the PLAIN-LANGUAGE RULE
requires.

A worked card, for a PR carrying one real finding. It is the card body: the ASK block below closes
it, and the budget does not count that block.

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
  closes on merge, PROBE flagged nothing.
```

### Reconcile the bullets before you present the card

**Run this after you have all six findings, and before you print the card.** The card prints the
BOTTOM LINE first, and you compute it last. Each finding above comes from a different step, and
nothing before this point compares them. Read them together as one set, and resolve them into the
BOTTOM LINE:

1. Find the findings that pull in opposite directions. A green check status beside a stale PR body
   is one shape. A valid ticket beside an ordering hazard carried over from PROBE is another.
2. Say in the open that they disagree. Name both findings.
3. Name the one that decides the merge. Say why it outranks the other.
4. Prefer the finding that blocks. "Not ready" outranks "ready", because this loop never merges to
   resolve uncertainty.

Two worked bottom lines:

- **No disagreement:** "This is a docs change I would merge, and the only thing holding it is that
  it edits `CLAUDE.md` — a file this project always sends to a human (escalation condition 1)."
- **A disagreement:** "The checks all passed, but the PR body describes a change the diff no longer
  makes (pre-merge check 7). The stale body decides this one: the checks say the code works, and
  they say nothing about whether the description that merges with it is true."

**A finding that contradicts this PR's classification row never reaches this step.** EVIDENCE above
makes that a stop. Reconcile only the findings that survive it.

**Never present bullets that disagree and leave the user to resolve them.** The user asked the loop
to read the PR. An unreconciled stack of verdicts hands that reading back undone.

### Post the review record, then present the card

Run the REVIEW RECORD phase above once the bottom line is computed. Present the card after that
comment posts. Report a record that failed to post, and present the card saying so.

**Post it whether or not this PR merges.** The user may answer "skip", and the PR then stays open.
The review still happened, and this comment is the only durable evidence of it (`CLAUDE.md` §6).

### Then close with the ASK block, queue it, and move on

Do NOT merge or touch the tracker yet. Ask about the merge only. A card that still needs a lock
ruling or a conflict ruling asks that question instead, and never both in one block.

```text
ASK — Shall I merge #NN?

  A) "go ahead on #NN"  (recommended — <the BOTTOM LINE, in one clause>)
     → I merge it, close its ticket, comment the merge commit there, and clear the
       "blocked" mark from the tickets it was holding up.
  B) "skip #NN"
     → I leave the PR open and its ticket unchanged, and move to the next PR.

  Blocked until you answer: #NN. Nothing merges and no ticket changes while I wait.
```

**Recommend the option the BOTTOM LINE supports.** A bottom line saying the PR is not ready
recommends `skip`, never `go ahead`. The two lines must never contradict each other.

**A PR you authored takes a different block.** You may not merge it on any verdict, so the merge
option is not yours to offer and does not appear (ASK BLOCK).

**A stacked child whose parent is open takes no merge option either** (STACKED PAIRS). Say on the
card that this PR builds on another open PR, and name that parent. Offer to hold the child until
the parent merges, and offer to skip it.

**A PR you repaired this run takes the hand-off block in REPAIR**, for the same reason: the repair
commit made you its author. Present the card, then close it with that block instead of the merge
block. A PR carrying another agent's repair is not yours — build the ordinary card. That record no
longer sends a PR here on its own, so name the condition that did, and say on the card that an agent
wrote part of this branch (`CLAUDE.md` §6).

**You cannot obtain a verdict on it either.** The `pr-reviewer` skill requires a
reviewer to refuse an invocation from the branch's author, and that refusal survives one level of
indirection: a reviewer *you* invoke is a reviewer the author invoked. Never offer to fetch a
verdict you cannot get. Offer to hand the PR off instead:

```text
ASK — Shall I hand #NN off for an independent review I cannot run myself?

  A) "hand it off"  (recommended — I wrote this branch, so neither my reading of it nor
     any reviewer I invoke counts as evidence; a session that did not write it does)
     → I comment on #NN saying it needs an independent review, name the commits I wrote,
       leave it open, and move to the next PR.
  B) "skip #NN"
     → I leave the PR open and its ticket unchanged, and say nothing on it.

  Blocked until you answer: #NN. I can neither merge it nor get a verdict on it, whatever
  you decide. Nothing merges and no ticket changes while I wait.
```

**Record the block in the escalation queue, then continue** (`CLAUDE.md` §13). Do not wait on this
PR. The DIGEST re-prints every queued block at the end of the run, and the user answers there. Group
the entry under what the answer unblocks: this PR, and the tickets its merge would sweep.

**Act on an answer only after you re-check the PR.** Other merges move BASE, so a card built earlier
may no longer describe what would land. Run the freshness step above first. Re-present the card when
the head SHA or BASE has moved, and ask again.

**Every answer to this block is handled below.** An ASK block whose recommended answer falls through
to "wait" promises an action and delivers silence.

- If the user says **"go ahead"** (or similar): this approves BOTH the merge AND the tracker
  update for THIS PR.
  a. **Check authorship before anything else.** Stop here if you wrote any commit on this branch,
     other than a mechanical resolution commit pushed under CONFLICT. **A repair commit pushed
     under REPAIR stops you here too** — it is your work, and the resolution-commit exemption
     (private D-77) does not reach it. Say that you cannot merge your own work, and that the user
     must merge it by hand or hand it to another session. **An approval never overrides this**
     (`CLAUDE.md` §6). Removing the merge option from a card removed the invitation, not this path
     — guard the path here, where the merge actually happens.
  b. **Stop here if this PR is a stacked child whose parent is still open** (STACKED PAIRS). Say
     the child waits on its parent, name that parent by number, and merge nothing. An approval
     never releases this hold.
  c. Merge only this PR: `gh pr merge <num> <MERGE strategy>` (from CONFIG). Use the merge-commit
     exception when this PR carries an open stacked child (STACKED PAIRS).
  d. Capture the resulting merge/squash commit SHA on BASE.
  e. Update the tracker for the resolved issue id:
  - `SET_STATUS` → target state.
  - `ADD_COMMENT` with the PR URL and the merge commit SHA (if the comment policy is on).
  f. Confirm merged + ticket updated. If no ticket id was found, merge only and say
     "no tracker update (no ticket linked)".
  g. **Sweep the dependents of the merged ticket:** run the DEPENDENT SWEEP below, and report its
     result on this card.
  h. **Retarget every open child of this PR:** run items 4 to 9 of STACKED PAIRS, and report each
     child on this card.
  i. `git fetch origin` so BASE is current.
  j. **RE-CHECK THE RISK MAP:** this merge may have activated a flagged semantic conflict or
     schema dependency for a later PR. If so, call it out now before moving on, and adjust the
     remaining order if needed.
  k. Continue to the next PR.
- If the user says **"hand it off"** on a PR you authored: comment on the PR that it needs an
  independent review from a session that did not produce the branch, and name the commits you
  wrote. Leave the PR open and its ticket unchanged. Move to the next PR. **Never merge it**, and
  never read a later "go ahead" on it as authorising you to.
- If the user says **"skip"**: leave the PR and its ticket untouched, move on.
- Anything else: treat as not-yet-approved and wait.

**Steps a and b guard every merge this lane performs**, including the one LOCK RESOLUTION reaches
by sending a released winner through this same card.

## DEPENDENT SWEEP (run after every merge, in both lanes)

A merge completes a ticket, and the dependency signals pointing at that ticket stop being true at
that instant. You are the only actor that knows the merge happened, so you clear them
(`CLAUDE.md` §6). Run this immediately after the ticket update, for the ticket you just merged:

1. List every ticket that declares the merged ticket as a blocker. Read the tracker's dependency
   relation, and the Dependencies section of the ticket where the project writes one.
2. Read the blockers of each ticket you found. Check the state of every one of them.
3. Clear the dependency signal on a ticket whose blockers are now **all** complete. Use the signal
   and the call CONFIG resolved.
4. `ADD_COMMENT` on that ticket naming the merge that unblocked it.
5. Keep the signal on a ticket that declares another blocker still open. `ADD_COMMENT` naming
   every blocker that remains, and clear nothing.
6. Leave the signal alone whenever you cannot confirm that every blocker is complete. Report that
   ticket by id, with what you could not read.
7. Sweep only the tickets blocked by the ticket you just merged. Touch no other ticket.

**Fail closed: never clear a signal you cannot verify.** A signal you clear wrongly puts a ticket
into a work loop that its blocker was protecting. A signal you leave costs one line in the report.

**Never assume a tracker call succeeded.** Read the result of each call. Report every ticket the
sweep could not reach and the error it returned, and never retry blindly.

**Report the sweep even when it does nothing.** "No ticket declares #NN as a blocker" is a result.
Silence is indistinguishable from a sweep that never ran.

**Report it in plain English, per ticket.** Say what changed and what it lets happen next. "#27 was
waiting on this one and has nothing else outstanding, so I removed its `blocked` mark and it can be
picked up now." A bare list of ids and labels is a log line, not a report (PLAIN-LANGUAGE RULE).

**Why this step exists.** A stale signal is not untidy — the loop that schedules work filters on
exactly that signal, so it hides an eligible ticket indefinitely and the backlog looks emptier
than it is. It happened four times in two days in the repository that publishes this skill, and a
human found all four (private D-80).

## LOCK RESOLUTION (when the user rules on a locked pair/group)

When the user declares a winner (e.g. "merge #133, drop #117" or "#117 wins"):

- The **WINNER** becomes eligible: present it via the normal review card, merge on go-ahead.
- The **LOSER** stays blocked. Do NOT merge it. Take only the disposition specified:
  - "skip"/"drop" → leave it open and untouched (no tracker change), OR
  - "close it" → close the PR ONLY if the user explicitly says so (closing is destructive; treat
    it like any irreversible action and confirm the PR number back to them first). **Never queue
    that confirmation** (`CLAUDE.md` §13): ask it in place, and close nothing until it arrives.
  If the user doesn't specify the loser's disposition, default to skip and tell them it's left open.
- Only after the winner is merged do you re-check conflicts for the loser (it may now conflict).
  Run CONFLICT on that check. Expect `intent`: the pair was locked because the two disagree.
- If the user says "defer", both stay locked and you move on to the next unlocked PR.
- NEVER pick the winner yourself. If the user never rules, both remain unmerged through the run.

**A released winner stays in the escalate lane for the rest of the run.** It was part of a
semantic conflict a human had to resolve, so a human sees the card that merges it. Do not
re-classify it into the auto lane.

**Confirm the ruling in plain English before you act on it.** Say which PR you understood to win,
what you will do with it, and what you will do with the loser. A ruling you misread costs a merge
that cannot be taken back. Ask again with a fresh ASK block whenever the answer names no PR.

## ENFORCEMENT — honoured, not enforced

**This loop is the gate, wherever the host does not enforce the checks server-side.** `PROJECT.md`
states which of the two situations applies. Read that field in CONFIG and report it.

- Read the check results yourself. Refuse on anything other than success.
- Never describe this skill as preventing a red merge. Where branch protection is unavailable,
  nothing server-side stops a human — or a misbehaving agent — merging a red PR.
- Treat that limitation as accepted, and never as a reason to relax a condition above.

## RULES

- **Classify every PR, and print the reason.** An `auto` row needs its reason as much as an
  `escalate` row does.
- **Fail closed.** A condition you cannot evaluate counts as met, and the PR escalates.
- **Never merge a PR you authored**, in either lane, on any verdict.
- **Never merge a stacked child before its parent**, in either lane, on any verdict, and on any
  approval. Find every child in SETUP's second listing pass, because the first one cannot see one.
  See STACKED PAIRS.
- **Merge a parent that carries an open stacked child with a merge commit, and keep its branch.**
  Then retarget each child to BASE, re-run its checks, re-classify it, and re-present it on its
  current head SHA. A retarget changes the base and never a commit, so no child is ever rebased.
- **Never merge to resolve uncertainty**, in either lane. Conflicts, failing checks, a locked
  pair, or a stale ticket mean stop and report.
- **The escalate lane never merges without the user.** It queues each card's question and moves to
  the next PR, and the DIGEST presents every queued question at the end (`CLAUDE.md` §13). Only
  merge + update the tracker after the user explicitly approves THAT specific PR. Approval never
  carries from one PR to the next, and it lapses if the diff changes after it was given —
  re-present and re-ask.
- **Queue a question rather than stopping, wherever stopping is not required** (`CLAUDE.md` §13).
  Two questions are never queued: a locked-pair ruling, and the confirmation for a destructive
  action such as closing a PR. Ask each one in place, and wait.
- **The auto lane merges only on `approve` from the independent reviewer.** Anything else — a
  different verdict, no verdict, or a reviewer that did not run — moves the PR to the escalate
  lane. Never supply that verdict yourself.
- **The independent verdict comes from a separately dispatched agent.** A verdict produced inside
  this loop's own context is not a verdict, and it merges nothing. A session that cannot dispatch
  that agent has no auto lane, and LANE AVAILABILITY says so before the first PR is read. A relayed
  verdict is the one exception to that lane rule, and it is not an exception to this one.
- **A verdict may be relayed to the merger.** A caller that already holds an independent verdict
  hands it over. Dispatch no reviewer for that PR. That verdict belongs to the head SHA it names.
  Read the PR's current head yourself, and treat the verdict as void when the two differ. See
  A RELAYED VERDICT.
- **No green signal ⇒ no auto lane.** Announce it once and run the whole batch through the
  escalate lane.
- **No checks reported is red.** Re-poll once, then escalate. Never read an empty check set as
  nothing to fail.
- **Every line you present follows the PLAIN-LANGUAGE RULE** — the PR summary, every escalation
  reason, every finding, every blocker, every conflict classification, every lock statement, the
  sweep result, the risk map, the final summary and every question. A jargon-free, effect-first
  explanation is required, not optional. Technical detail stays off the review card, and you print
  it when the user asks for it — after the plain summary, never instead of it.
- **Report an auto-merged PR in plain English, exactly as you present an escalated one.** Print the
  WHAT IT DOES block the review card defines, above the merge SHA, the tracker result and the sweep
  result. Nobody watched this merge happen, so this report is the only account of it.
- **An identifier never explains a finding on its own.** Write the plain sentence, then cite the
  condition, the check, the shape or the section after it. Rewrite any line where the number is
  doing the explaining. Keep every identifier you had: the sentence carries the meaning, and the
  identifier keeps the run auditable.
- **Gloss the loop's own vocabulary** wherever it reaches a presented line — footprint, green
  signal, BASE, head SHA, dependency signal, sweep, lock, lane, classification, and the two
  conflict classes. Half a sentence each, from the table in PLAIN-LANGUAGE RULE.
- **Reconcile a card's findings before you present it.** Open every review card with a BOTTOM LINE
  naming the finding that decides the merge. Compute it last, and print it first. Say in the open
  when two findings disagree, and name the one that decides. Reconcile the card against its
  classification too, not only its bullets against each other. A restated finding that contradicts
  the PR's classification row is a stop, and you pick neither reading. Never hand the user an
  unreconciled stack of verdicts.
- **A review card has a fixed shape and a length budget.** Print DECISION, then WHAT IT DOES, then
  EVIDENCE, and keep the body to 25 lines or fewer. Buy that brevity by cutting words. Never buy it
  by replacing a plain sentence with a condition number, and never by dropping a finding.
- **Close every stop with an ASK block** — one question, one line on what the run already tried
  when it tried anything, each option and what it causes, the recommended option first with its
  reason, and what stays blocked until the user answers. The
  stops are the PROBE order approval, a locked pair, an `intent` conflict, a repair hand-off, the
  review card and the FINAL SUMMARY. The FINAL SUMMARY is the only one that may end without a
  block, and only when the
  run left nothing waiting on the user. A queued block is re-printed in the DIGEST, never rewritten.
  **The PROBE order approval is not a stop at a queue of one open PR**, because one PR has one
  order. That is the one exception, and PROBE still runs.
- **One decision per ASK block.** Never compound two questions into one. Ask the second question
  after the user answers the first.
- **PROBE is mandatory** and happens before CLASSIFY and before any merge — never skip it to save
  time. A per-PR gate alone surfaces problems just-in-time; PROBE surfaces batch-wide problems up
  front. Both run. **Degenerating is not skipping.** A queue of one open PR runs steps 1, 2 and 4
  and drops the cross-batch steps, because a pair is what they read. A queue of two or more runs
  every step, and no queue size lets you skip the phase.
- **HARD STOP on locked pairs:** if two (or more) PRs are flagged as semantically conflicting,
  NEITHER may be merged in either lane until the user explicitly declares which wins. This
  overrides the merge order and the classification — a locked PR is skipped, not merged, no matter
  its position or its lane. Never auto-resolve, never guess, never merge one "to see." The lock is
  released only by the user's ruling.
- **Never close a PR and never force-push**, in either lane, whatever a conflict classifies as.
  Closing needs the user's explicit go-ahead for that PR. Force-pushing is never permitted here.
- Never change a ticket if its PR was skipped, locked, or not merged.
- **Read every PR body against its current diff** (pre-merge check 7). A body that describes a
  superseded version of the change fires escalation condition 7. Report it on the card, and never
  wave it through as a note.
- **Post the review record on every PR you review, in both lanes.** One comment on the PR carries
  the outcome of pre-merge checks 2–5 and 7, and that comment is the only valid surface for it
  (`CLAUDE.md` §6). Post it before the merge. Post it even when the PR does not merge. Merge nothing
  whose record failed to post. See REVIEW RECORD.
- **Sweep the dependents after every merge**, in both lanes. See DEPENDENT SWEEP. Clear the signal
  only on a ticket whose blockers are all complete. Keep it, and name the open blocker, on a ticket
  that still has one. Leave it, and report the ticket, whenever you cannot verify a blocker's
  state. Sweep only the tickets the merged ticket blocked.
- If the tracker update fails (auth, wrong state name, ticket not found), tell the user — do NOT
  retry blindly or guess a different state/ticket. The merge still stands; report the mismatch.
- Merging changes BASE, so re-fetch before each PR, and re-check the risk map after each merge.
  Re-read the diff and re-check conflicts when the head SHA or BASE has moved since the
  classification.
- **Classify every conflict, then act on the class.** Resolve a `mechanical` conflict on the branch
  and push it. Escalate an `intent` conflict, and name both sides. Print the classification and its
  reason either way. `intent` is the default, and an unclassifiable conflict is `intent`.
  See CONFLICT.
- **Never merge through a conflict.** Resolving one on the branch is permitted. Resolving one
  inside the merge is not, in either lane, on any verdict.
- **Repair a defect on the branch rather than handing the PR back to its author.** Repair only the
  five shapes REPAIR lists, inside the issue's declared footprint, and only after you watch the
  project's whole pre-PR gate pass in a scratch worktree. Discard a repair whose gate fails, and
  escalate instead. See REPAIR.
- **Repair every repairable finding, however many passes that takes.** There is no cap. Audit the
  whole body or file against the diff before calling a pass complete — a half-repaired record is
  worse than an unrepaired one, because the parts you fixed make the parts you missed look checked.
  A failed gate and a red check stop a repair; a pass count never does.
- **Never repair a policy flag.** A risk-listed path, a footprint stray, an oversized diff, a
  weakened test, a cancelled ticket, a contradicting decision, an irreversible effect, an `intent`
  conflict and a locked pair are not defects, and repairing one decides scope on the user's behalf.
- **A repair makes you the PR's author**, and the resolution-commit exemption (private D-77) does
  not reach it. Never merge that PR, and never fetch a verdict on it. Hand it off, and leave the
  repair record a later session reads.
- **A PR carrying a repair record you wrote always escalates.** A record another agent wrote
  escalates nothing on its own, and the remaining conditions decide the lane. See AUTO LANE for the
  three things you verify before merging such a PR.
- **A resolution voids the PR's approvals.** The diff changed, so the human approval, the
  reviewer's verdict and the classification all lapse. Re-classify, then re-present or re-review.
- **Never resolve a conflict on a locked pair**, and never resolve one on a PR whose own work you
  authored. Both hold whatever the hunks look like.
- Before merging, honor the seven pre-merge checks in `CLAUDE.md` §6 — correctness, decision
  freshness against the decision log, duplicate check, staleness vs BASE, ticket still valid,
  out-of-band verification, and body freshness. The independent reviewer covers them in the auto
  lane; PROBE, CLASSIFY and the review card cover most of them in the escalate lane. Flag anything
  still open.

## DIGEST (present the escalation queue once, at the end)

The escalation queue holds every question this run recorded instead of stopping for.
`CLAUDE.md` §13 defines the queue, the entry and where the queue lives. This section says how to
present it. Print the digest last, after everything the FINAL SUMMARY prints.

1. Say how many decisions the digest carries, in one sentence.
2. Group the entries by what the answer unblocks. Name each group in one plain sentence.
3. Print the groups in the order you recommend answering them.
4. Re-print each entry's ASK block unchanged. Never rewrite a block to shorten the digest.
5. Name the PR each entry belongs to, and say where in the run its card was presented.
6. Say what an unanswered entry means: the PR stays open, and its ticket stays as it is.

**Answer handling stays where the question was asked.** A merge approval on a queued entry runs the
escalate lane's answer steps for that PR, starting at the authorship check. A conflict ruling runs
CONFLICT's steps for that PR. A repair hand-off answer runs REPAIR's, and a "leave it for the next
run" needs nothing of you beyond leaving the PR as it stands. Re-check the head SHA and BASE before
a merge or a conflict ruling, under the ESCALATE LANE's freshness step.

**An answer to one entry never carries to another** (`CLAUDE.md` §6). Each merge needs its own
go-ahead, and a digest that reads one "go ahead" as approving several PRs is a blanket approval
under another name.

**A run that queued nothing prints no digest.** Say so in one sentence in the FINAL SUMMARY, so the
absence reads as a finished run rather than a lost question.

## FINAL SUMMARY (when the run ends)

Print one row per PR, and give every field a value:

| PR | Lane | Classification reason | Conflict | Repair | Reviewer verdict | Merge result | Ticket result | Dependents swept |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

- **Lane** — `auto` or `escalate`, and note any PR the auto lane handed back.
- **Classification reason** — the conditions that fired, or the ones you cleared.
- **Conflict** — `none`, `mechanical` with the shape and the pushed SHA, or `intent` with the two
  sides named. Never leave this blank for a PR that conflicted.
- **Repair** — `none`, the findings you repaired with their shapes and the pushed SHA, or
  `attempted, discarded` with the reason. Write `record from an earlier run` for a PR that arrived
  carrying one. Never leave this blank.
- **Reviewer verdict** — the verdict, or `not invoked` with the reason.
- **Merge result** — merged with its SHA, skipped, locked-unresolved, or failed with the error.
- **Ticket result** — updated, skipped, or failed with the error.
- **Dependents swept** — every ticket the sweep touched, by id, and what happened to each one:
  `cleared`, `kept (blocked by #NN)`, `left (unverifiable)`, or `failed` with the error. Write
  `none` when no ticket declared this one as a blocker. Never leave this blank for a merged PR.

Then state which risk-map flags were resolved, which are still open, and which the run newly
triggered.

Then name every stacked pair the run found (STACKED PAIRS). Give the parent, the child and the
child's base branch. Say for each child whether the run retargeted it, or what it still waits on.
Say "the run found no stacked pair" in one sentence when it found none.

**Close with a plain paragraph, then one ASK block if anything still waits on the user.** Write
three sentences or fewer: what merged, what did not, and what the run needs next. Say how many
decisions the DIGEST carries, or that it carries none. Write it for a reader who saw none of the
cards (PLAIN-LANGUAGE RULE). The table above is the record; this paragraph is the answer.

**Name every auto-merged PR that carried a repair, in that closing paragraph.** Give its number, its
repair round count, and what each round repaired. Those sentences are additional to the three above.

Two reasons, and the `Repair` column alone serves neither. A reader who skims the paragraph must
still see that an agent edited that branch. A PR that needed three rounds says something about the
issue rather than the code, and nobody sees a pattern that was never printed.

**This is the one stop whose ASK block is conditional** (ASK BLOCK). End without one when the queue
is empty, every PR resolved and no ticket was left unswept. Say so in the paragraph, so the absence
reads as a finished run rather than a forgotten question.

**The queued questions live in the DIGEST, not here.** Ask here only about something the queue does
not carry — a next step the run itself needs. Ask about one thing only, and print the DIGEST after
it.

```text
ASK — Shall I bring #117 back for review now that #133 has merged?

  A) "yes, re-check #117"  (recommended — its conflict may be gone now, and it is the
     last PR in the queue)
     → I re-read it against the updated default branch and bring you a card.
  B) "leave it"
     → I stop here and the run ends.

  Blocked until you answer: #117. Its ticket keeps its "blocked" mark until it merges.
```

---

When invoked, **start with CONFIG. Then take SINGLE-PR MODE when the invocation names one pull
request, and SETUP otherwise.**
