---
name: pr-merge-loop
description: >-
  Review and merge open pull requests under the two-tier gate in CLAUDE.md §6, then
  update each merged PR's ticket and sweep the tickets it unblocked. Use when the user
  says "review and merge the open PRs", "clear the PR queue" or "merge the backlog of
  PRs", or when the cycle-manager skill dispatches one PR in SINGLE-PR MODE. A PR that
  trips any of the eight escalation conditions waits for the user's approval of that
  PR; one that trips none merges after an independent reviewer approves it.
  Fail-closed: a condition it cannot evaluate counts as met. Runs a read-only PROBE,
  then classifies every PR and prints the reason. Resolves a mechanical conflict on the
  branch and escalates an intent one. Repairs a defect on the branch, then hands that
  PR to a later session. Queues its questions for one digest at the end, and asks a
  lock ruling, a contradiction, a destructive action and the run order in place. Reads
  its tools and gate from PROJECT.md.
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
- **MERGE strategy** — how the project merges (e.g. `--merge --delete-branch`, or
  `--squash --delete-branch`). Use exactly what `PROJECT.md` specifies. Resolve the
  **stacked-parent strategy** as well: how to merge a parent that carries an open stacked child.
  STACKED PAIRS states what it is for.
  - A strategy that already merges with a merge commit needs no exception. A stacked parent merges
    with that strategy, and keeps its branch.
  - A squash or rebase strategy needs a declared exception. Use the exception `PROJECT.md`
    declares.
  - With a squash or rebase strategy and no declared exception, hold the parent and escalate it.
    Name the missing field. Never improvise a merge-commit flag.
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

**If `PROJECT.md` is missing, STOP.** A missing `PROJECT.md` does not make the project new. Run
`CLAUDE.md` §0, Project Bootstrap. It routes the project to the interview or to the
`project-onboard` skill. Never write a partial `PROJECT.md` from this skill.

**If `PROJECT.md` has no tracker mapping or no host mapping, STOP and name what is missing.** Never
guess it. Its fix is a ticket, filed with the `issue-writer` skill.

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
no commit. It resolves no conflict and makes no repair. Each of these stops the merge, and the PR
stays open:

- a conflict with BASE;
- a defect;
- a required check that is not success;
- a ticket that was cancelled, descoped or superseded;
- no review record posted for the current head.

**PROBE still runs in this mode, scoped to its one PR.** Step 5 below says what that scope keeps.

Run these steps in order. **A step that stops this mode skips to step 9**, so every stop returns
the `CYCLE-MERGE-RESULT` block.

1. Read the PR number from the invocation. Stop when the invocation names no number, or names more
   than one, and report why.
2. Read the verdict block in the invocation under A RELAYED VERDICT, and apply its four rules.
   Dispatch no reviewer. Stop when no verdict block is present, because condition 6 is then met.
   Stop on a void verdict too, and report why.
3. Print one line that names this mode, says it skips SETUP's batch listing, and says PROBE runs
   scoped to this PR.
4. List the open PRs once, read-only: `gh pr list --state open --limit 1000 --json number,baseRefName,headRefName`.
   Hold this PR, and merge nothing, when any check finds a hit.
   - **A base that is not BASE.** This PR's `baseRefName` is not BASE, so a merge would land on that
     branch and never reach BASE. This covers a child whose parent merged but was never retargeted
     (STACKED PAIRS). Only a full run retargets it.
   - **A stacked child.** This PR's base is another open PR's head branch. Hold this PR under
     STACKED PAIRS. Name this PR and its parent by number in the stop reason.
   - **A parent with an open child.** Another open PR's base is this PR's head branch. Name this PR
     and each open child by number in the stop reason.

   **Say in either stop reason that a full `pr-merge-loop` run merges the pair, parent first.**
   This mode never merges either one, because the retarget after the parent's merge writes to
   another PR.
5. Run PROBE, scoped to this PR. It stays read-only. With no other open PR, its cross-batch steps
   degenerate exactly as the queue-size rule in PROBE says.
   - Run step 1 for this PR and for every other open PR. Run step 2 for this PR.
   - Run step 4, the SCHEMA CHECK, for this PR. Send this PR to the escalate lane when it flags
     drift, and carry the flag onto the review card.
   - Run step 3, the CROSS-DIFF PASS, for every pair that includes this PR. Hold this PR, and merge
     nothing, on any finding: a semantic conflict, a duplicate, an ordering hazard or a file
     overlap. Treat that pair as a locked pair under the HARD STOP in the escalate lane. Ask in
     place, and classify nothing.
   - Skip pairs that exclude this PR. They do not change whether this PR may merge.
   - Skip step 5's risk map, its revised order and the order question. This mode merges one PR, so
     no order exists to decide. Print step 2's risk note for this PR instead.
   - Print one line naming the steps and the pairs this scope skipped, as the queue-size rule does.
6. Run `git fetch origin` so BASE is current, then run CLASSIFY for this PR alone, and print its
   reason. CLASSIFY reads the change type against the fetched BASE.
7. Run CONFLICT's classification for this PR. Print the class and its reason. Resolve nothing,
   whatever the class, because a resolution is a commit. Any conflict with BASE stops this mode.
   Close it with one ASK block, and queue that block (`CLAUDE.md` §13).
   - An `intent` conflict takes CONFLICT's ASK block, which asks which side the project wants.
   - A `mechanical` conflict asks whether to leave this PR for a full run, which resolves it on the
     branch.
8. Choose the lane, and run the merge steps only when the lane allows them.
   - **Auto lane**, when CLASSIFY says `auto`, the relayed verdict is `approve`, and step 5 flagged
     no schema drift. AUTO LANE steps 1 to 8 are covered by steps 1 to 7 above, with step 1's fetch
     run in step 6. Run AUTO LANE steps 9 to 15 in order. This lane needs no answer, and never
     waits for one (A RELAYED ANSWER).
   - **Escalate lane**, otherwise. Run the REVIEW RECORD phase, then build the review card and print
     it. A contradiction or a destructive action is asked in place instead. Merge only when the
     relayed answer passes A RELAYED ANSWER and approves this PR under the approval gate in
     `CLAUDE.md` §6. "Not yet approved", silence, and an answer about another PR are not approval.
     On approval, run escalate-lane steps a to c first, and merge nothing if any one stops. An
     approval does not override the authorship check in step a. Then run escalate-lane steps d to h
     in order. Record the card's merge question in the digest only when the answer does not approve
     this PR. An approved PR queues nothing, because a merged PR has no question left to ask.
9. When this PR merged in the auto lane, print its WHAT IT DOES block first, as AUTO LANE step 19
   requires. The escalate lane's card already carries the report of its merge. After a stop, print
   the reason for it first. Then return the block below. Then print the FINAL SUMMARY row and the
   DIGEST for this PR, in their own shapes.

```text
CYCLE-MERGE-RESULT
merged      <this PR number when it merged, or none>
still-open  <this PR number when it did not merge, or none when step 1 found no single number>
queued      <1 when this run queued a question in the digest: a conflict question, or a merge question the answer did not approve; 0 otherwise, including when the PR merged on approval>
hard-stops  <this PR number when its question was asked in place, or none>
```

A question is either queued or asked in place, never both. A PR held for a base that is not BASE, a
held stacked child, a held parent, and a stop in step 2 count as still-open and queue no question. A
stop in step 1 writes `none` in `merged`, `still-open` and `hard-stops`, and 0 in `queued`. The
`cycle-manager` skill reads this block, so print its four field names exactly as written.

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

   **Also keep every open PR whose base is neither BASE nor another open PR's head branch.**
   Classify it as an orphaned child, and send it to STACKED PAIRS item 4.

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

Read `references/stacked-pairs.md` whenever SETUP step 2 finds a stacked pair or an orphaned
child, before either lane acts on any PR in it.

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
an `intent` conflict, a repair hand-off, the review card, a restated finding that contradicts its
PR's classification row (ESCALATE LANE), and the FINAL SUMMARY. A stop without an
ASK block is a stop the user cannot answer.

**The FINAL SUMMARY is the one stop that may end without one.** A run that left nothing waiting on
the user has no decision to ask about, and a question invented to fill the slot is noise. Every
other stop is a decision request by definition, so its ASK block is never optional. See FINAL
SUMMARY.

**The PROBE order approval is not a stop at a queue of one open PR.** One PR has one order, so the
phase reaches no order decision and ends with no ASK block. SINGLE-PR MODE reaches none either,
because it merges one PR. Those are the only two cases the PROBE stop does not occur, and PROBE
itself still runs in both. See the queue-size rule in PROBE.

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
recommendation leaves that path open. Each of these carries this bar:

- a PR you authored;
- a locked pair;
- an `intent` conflict;
- a required check that is red or missing;
- a ticket that was cancelled, descoped or superseded;
- a review record that is not posted for the current head.

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

**Four blocks are never queued.** Ask a locked-pair ruling in place, and wait. Ask a destructive
action's confirmation in place, and wait. Ask a restated finding that contradicts its PR's
classification row in place, and wait. Ask the PROBE order question in place, and wait. All four
are hard stops (`CLAUDE.md` §13).

## PROBE (run once, BEFORE any merging)

Purpose: read the WHOLE batch as a set so cross-PR problems surface up front, not at each card.
This phase is **read-only**. It merges nothing and touches no ticket.

### The queue-size rule — apply it before step 1

Count the open PRs once, before you read the first diff. That count is the **queue size**, and it
sets which steps run.

- **Two or more open PRs:** run every step below, in full.
- **Exactly one open PR:** run steps 1, 2 and 4. Skip step 3. Skip step 5. Skip step 6.

**SINGLE-PR MODE scopes PROBE to its one PR, and that is the one exception to the full run.** It
runs step 4 for its PR, and step 3 for every pair that includes its PR. It skips the pairs that
exclude its PR, and step 5's risk map and order. Its step 5 says what runs. It never skips the phase.

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
   - **Use introspection only:** tables, columns, constraints and applied migrations.
   - Send no statement that writes. Use only read-only access, through the DB tooling `PROJECT.md`
     names.
   - When `PROJECT.md` names no read-only access, the check cannot be evaluated. Flag drift, so the
     PR escalates (`CLAUDE.md` §6, the tie-break).
   - Never use a write-capable credential for this check. Never print a credential (`CLAUDE.md`
     §8).
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
order, and **WAIT for the user's answer**. This is a hard wait, because `CLAUDE.md` §13 asks a
question about the run's order in place. Never proceed on an order the user has not answered.

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

  Blocked until you answer: every PR in the queue. I merge nothing until you settle the order.
```

**PROBE is mandatory, and it stays read-only.** It runs before CLASSIFY and before either lane, at
every queue size. A queue of one degenerates its cross-batch steps and skips none of the phase.
SINGLE-PR MODE scopes it to one PR, and skips none of the phase either.
A locked pair is never auto-merged, whatever its classification.

**PROBE records a conflict. It resolves none.** Resolving is a write, and this phase writes
nothing. Carry every conflict it found into CONFLICT, which runs after CLASSIFY.

## CLASSIFY (run once, after PROBE, before the first card)

Sort every PR into a lane. The conditions come from `CLAUDE.md` §6, and they are predicates you
**check**, not risks you weigh. Evaluate them against the diff, the check results and the ticket.

### Three gates first — any one sends the PR to the escalate lane

1. **Authorship.** Did you write any commit on this branch? Include earlier sessions in that
   answer. Classify `escalate` if the answer is yes. Classify `escalate` if you cannot tell.
   - **Count only this evidence:** this run's own push log, and a resolution or repair record that
     names this run.
   - **A git author or committer field is not evidence.** A builder, a repairer and a merger often
     push under one identity, so those fields cannot separate them.
   - **SINGLE-PR MODE writes no commit**, so a merger in that mode wrote nothing in this run.
   - **Answer for any commit other than a mechanical resolution commit pushed under CONFLICT.** That
     commit does not count as one you wrote. CONFLICT step 8 re-runs CLASSIFY, so without this
     exemption every resolved PR escalates on authorship. A repair commit is not covered. A
     resolution commit you cannot tell apart from your other commits counts as yours.
   - **The residual risk:** a commit an earlier session wrote, under the same git identity, that
     left no record. This evidence cannot see that commit.
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
   Read the declared footprint from the ticket. Normalise every declared entry before you compare
   it, under the `issue-loop` skill's rule "Normalise every declared path first", in its section
   "The disjointness test". Without that step, a changed `PROJECT.md` matches no entry written as
   `PROJECT.md`, "Build / lint / test commands", and reads as a stray. Name every changed file
   outside the normalised footprint. This condition fires when enforcement is on and the ticket
   declares no footprint.
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
   comment on it. List the decision entries BASE gained since the branch point:

   ```sh
   git diff --name-only --diff-filter=AMD "$(git merge-base origin/<BASE> <SHA>)" origin/<BASE> -- decisions.d/
   ```

   Read each listed entry from `origin/<BASE>`. Judge an entry this pull request itself adds under
   check 1, never under check 2. Read the PR body against the current diff. This condition fires
   on a ticket that was cancelled, descoped or superseded. It fires on a decision entry that
   touches what this PR changes. It fires on a body that describes a superseded version of the
   change — never record that as a finding and pass the PR on.
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

Read `references/conflict.md` after CLASSIFY, before either lane acts on a PR the host reports
as not cleanly mergeable against BASE.

## REPAIR — fix a defect on the branch, then hand the PR off

Read `references/repair.md` after CONFLICT, before either lane acts on a PR with a repairable
finding from CLASSIFY, CONFLICT, PROBE or a non-approve reviewer verdict.

## REVIEW RECORD (post it in both lanes, before the PR merges)

`CLAUDE.md` §6 requires one comment on the PR carrying the outcome of pre-merge checks 2–5 and 7.
That comment is the only valid surface, and this phase is where the loop writes it. **The
`MERGE-LOOP REVIEW RECORD` is the `CLAUDE.md` §6 review record.** The `pr-reviewer` skill's verdict
comment is the independent verdict this record cites, never the §6 record itself. Both lanes run
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

**The duplicate line reads the same source as the review card's duplicate item** (EVIDENCE item 9):
the open PRs, plus the PRs merged into BASE since the branch point, at every queue size.

Five rules bound the record:

1. **Name the head SHA the record belongs to.** A record naming no commit describes no diff.
2. **Write every line under the PLAIN-LANGUAGE RULE.** A check number cites; it never explains.
3. **Post one record per head SHA.** A moved head gets its own record. Read the PR's comments
   before you post.
   - When a `MERGE-LOOP REVIEW RECORD` for this head SHA carries the same lane and the same five
     outcomes, post nothing. Cite that comment on the card.
   - When any outcome differs, post a new record that names the one it corrects (rule 4).
   - A comment list you cannot read counts as no record, so post one.

   Read first because the `cycle-manager` skill dispatches a merger for one head more than once:
   on the direct route, then on the digest route. Each of those runs reaches this phase.
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
    carries an open stacked child with the stacked-parent strategy CONFIG resolved, and keep its
    branch (STACKED PAIRS).
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

  A) "#133 wins"  (recommended — it is the newer change, and the decision log already chose
     its approach, private D-70)
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

Read `references/review-card.md` before you build a card: it holds the DECISION, WHAT IT DOES and
EVIDENCE blocks, the classification-contradiction stop, and the card's length budget.

### Reconcile the bullets before you present the card

**Run this after you have all ten EVIDENCE findings, and before you print the card.** The card
prints the BOTTOM LINE first, and you compute it last. Each EVIDENCE finding comes from a different
step, and nothing before this point compares them. Read them together as one set, and resolve them
into the BOTTOM LINE:

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

**A finding that contradicts this PR's classification row never reaches this step.** EVIDENCE
makes that a stop (`references/review-card.md`). Reconcile only the findings that survive it.

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
may no longer describe what would land. Record the BASE commit each card was built on. Run the
freshness step above first. Then:

- **Head moved:** re-present the card, and ask again.
- **Only BASE moved:** run `git diff --name-only <BASE at card time> origin/<BASE>`, and intersect
  it with this PR's changed files. Re-run CLASSIFY and CONFLICT. Re-ask only when the intersection
  is non-empty, or when either result changed. Otherwise act on the answer.

**Every answer to this block is handled below.** An ASK block whose recommended answer falls through
to "wait" promises an action and delivers silence.

- If the user's answer **names this PR, by number or by title, and approves it** ("go ahead on
  #NN"): this approves BOTH the merge AND the tracker update for THIS PR. A bare "go ahead" that
  names no PR is not yet an approval. Say so, and ask again.
  a. **Check authorship before anything else.** Stop here if you wrote any commit on this branch,
     other than a mechanical resolution commit pushed under CONFLICT. **A repair commit pushed
     under REPAIR stops you here too** — it is your work, and the resolution-commit exemption
     (private D-77) does not reach it. **Stop here too when this run posted a
     `REPAIRED BY THE MERGE LOOP` record on this PR.** Use the test of CLASSIFY's third gate: read
     the PR's comments, and stop when this run wrote the record or you cannot tell. That test
     covers a body-only R2 repair, which pushes no commit. Say that you cannot merge your own work,
     and that the user must merge it by hand or hand it to another session. **An approval never
     overrides this** (`CLAUDE.md` §6). Removing the merge option from a card removed the
     invitation, not this path — guard the path here, where the merge actually happens.
  b. **Stop here if this PR is a stacked child whose parent is still open** (STACKED PAIRS). Say
     the child waits on its parent, name that parent by number, and merge nothing. An approval
     never releases this hold.
  c. **Stop here on any of these three, and merge nothing.** An approval never overrides them.
     Stop when a required check, re-read now with `gh pr checks <num>`, is not success (escalation
     condition 2, and ENFORCEMENT). Stop when the ticket was cancelled, descoped or superseded
     (escalation condition 7, its ticket half). Stop when no review record is posted for the
     current head (REVIEW RECORD).
  d. Merge only this PR: `gh pr merge <num> <MERGE strategy>` (from CONFIG). Merge a PR that
     carries an open stacked child with the stacked-parent strategy CONFIG resolved, and keep its
     branch (STACKED PAIRS).
  e. Capture the resulting merge/squash commit SHA on BASE.
  f. Update the tracker for the resolved issue id:
  - `SET_STATUS` → target state.
  - `ADD_COMMENT` with the PR URL and the merge commit SHA (if the comment policy is on).
  g. Confirm merged + ticket updated. If no ticket id was found, merge only and say
     "no tracker update (no ticket linked)".
  h. **Sweep the dependents of the merged ticket:** run the DEPENDENT SWEEP below, and report its
     result on this card.
  i. **Retarget every open child of this PR:** run items 4 to 9 of STACKED PAIRS, and report each
     child on this card.
  j. `git fetch origin` so BASE is current.
  k. **RE-CHECK THE RISK MAP:** this merge may have activated a flagged semantic conflict or
     schema dependency for a later PR. If so, call it out now before moving on, and adjust the
     remaining order if needed.
  l. Continue to the next PR.
- If the user says **"hand it off"** on a PR you authored: comment on the PR that it needs an
  independent review from a session that did not produce the branch, and name the commits you
  wrote. Leave the PR open and its ticket unchanged. Move to the next PR. **Never merge it**, and
  never read a later "go ahead" on it as authorising you to.
- If the user says **"skip"**: leave the PR and its ticket untouched, move on.
- Anything else: treat as not yet approved. Queue the card's merge question, and move to the next
  PR.

**Steps a to c guard every merge this lane performs**, including the one LOCK RESOLUTION reaches
by sending a released winner through this same card.

### A RELAYED ANSWER — the user's own words, carried by a caller

A caller may carry the user's answer to you, from a digest the caller presented. The
`cycle-manager` skill does so in its C5 brief (scaffold D-7). The answer arrives as two lines:

```text
The user's answer, verbatim: "<the user's words, or 'not yet approved'>"
The answer was given for: pull request <N>, head commit <SHA, or none>
```

**The auto lane needs no answer, and never waits for one.** Merge a PR the auto lane cleared without
waiting for an answer. The gate already cleared it, so it needs no approval. `not yet approved` holds
nothing in this lane. Hold the PR only when the answer line declines it, such as "skip #NN".
Holding is the fail-closed direction, so a decline needs none of the checks below.

**In the escalate lane, read `not yet approved` first.** It is no answer, and it is not a refusal.
Build the card, and queue its merge question.

**The escalate lane accepts any other answer as approval only when all four checks pass.** Run them
in order. The approval gate in `CLAUDE.md` §6 is the reason for each one.

1. **The answer is the user's own words.** Words about the user are a caller's summary, never the
   user's words. "The user approved #NN" and "they said go ahead" are two examples. Refuse the
   answer when you cannot tell. A summary is not approval (approval rule 1).
2. **The answer names this PR.** Refuse an answer given for another pull request, or for none.
3. **The answer names a head commit, and it equals the PR's current head.** Read the current head
   from the host yourself. Refuse an answer that names no head. Refuse one that names another head:
   that approval expired when the diff changed (approval rule 4).
4. **The words approve this PR.** Read them under the answer handling above. "Go ahead on #NN"
   approves. Anything else is not yet approved.

**State every refusal in one plain sentence, before the card.** Name the PR, the check that failed,
and what the user must do. Then build the card on the current head, and queue its merge question.
The user answers that question in their own words.

**A caller never approves a merge.** It carries the user's words, and the user approves. A caller's
summary, a caller's reading of the words, and a caller's statement that the user agreed each
authorise nothing.

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
than it is. It happened four times in two days in the private repository this scaffold grew in, and
a human found all four (private D-80).

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

**The hard rules, one sentence each.** No issue, verdict or approval overrides one of them.

- **Fail closed:** a condition you cannot evaluate counts as met, and the PR escalates.
- **Never merge a PR you authored**, in either lane, on any verdict.
- **Never merge a stacked child before its parent**, in either lane, on any verdict or approval.
- **Never merge to resolve uncertainty**, in either lane.
- **Never weaken, skip or delete a test**, to make a repair pass or for any other reason
  (`CLAUDE.md` §11 rule 10).

**Every other rule lives in the section this index names.** Read the rule there.

- Classify every PR, and print the reason: CLASSIFY.
- Find every stacked child, and merge its parent with the stacked-parent strategy: SETUP step 2,
  CONFIG and STACKED PAIRS.
- The escalate lane never merges without the user's approval of that PR: ESCALATE LANE.
- Queue a question, except the questions asked in place: ASK BLOCK.
- The auto lane merges only on `approve` from a separately dispatched reviewer: AUTO LANE, and
  LANE AVAILABILITY.
- A verdict your caller relays: A RELAYED VERDICT.
- An answer your caller relays, where only the user's own words approve: A RELAYED ANSWER.
- No green signal means no auto lane: LANE AVAILABILITY.
- No checks reported is red: CLASSIFY, "No checks reported is RED".
- Every presented line in plain English, with each identifier after its sentence: PLAIN-LANGUAGE
  RULE.
- An auto-merged PR reported in plain English: AUTO LANE step 19.
- Reconcile a card before you present it: ESCALATE LANE, "Reconcile the bullets before you present
  the card".
- The card's three blocks, its ten EVIDENCE items and its length budget: ESCALATE LANE, "The card
  has three blocks, printed in this order".
- Close every stop with an ASK block, one decision per block: ASK BLOCK.
- PROBE is mandatory, and degenerating is not skipping: PROBE.
- The HARD STOP on locked pairs: ESCALATE LANE's lock check, PROBE step 6, and LOCK RESOLUTION.
- Never close a PR without the user's go-ahead for that PR: LOCK RESOLUTION.
- Never force-push: CONFLICT, REPAIR bound 8, and STACKED PAIRS item 5.
- Never change a ticket for a PR that did not merge: the merge steps of AUTO LANE and ESCALATE
  LANE.
- Read every PR body against its current diff: CLASSIFY condition 7.
- Post the review record on every PR you review: REVIEW RECORD.
- Sweep the dependents after every merge: DEPENDENT SWEEP.
- Report a failed tracker update, and never retry or guess: AUTO LANE, "Never merge to resolve
  uncertainty", and `CLAUDE.md` §6 approval gate rule 5.
- Re-fetch before each PR, and re-check the risk map after each merge: AUTO LANE steps 1, 17 and
  18, and ESCALATE LANE's freshness check.
- Classify every conflict, and never merge through one: CONFLICT.
- Repair a defect on the branch, repair every repairable finding, and never repair a policy flag:
  REPAIR.
- A repair makes you the PR's author, and a repair record you wrote escalates the PR: REPAIR, and
  CLASSIFY's third gate.
- A resolution voids the PR's approvals: CONFLICT, "A resolution voids every approval the PR
  already carried".
- Never resolve a conflict on a locked pair or on your own work: CONFLICT's two gates.
- Honour all seven pre-merge checks in both lanes: CLASSIFY, "The seven pre-merge checks still
  apply", and the card's EVIDENCE.

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

**A caller may relay an answer to a digest it presented itself.** That answer arrives in SINGLE-PR
MODE. Read it under A RELAYED ANSWER.

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
repair pass count from its `REPAIRED BY THE MERGE LOOP` records, and what each pass repaired. Those
sentences are additional to the three above.

Two reasons, and the `Repair` column alone serves neither. A reader who skims the paragraph must
still see that an agent edited that branch. A PR that needed three passes says something about the
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
request and asks for a `CYCLE-MERGE-RESULT` block, and SETUP otherwise.**
