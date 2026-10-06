---
name: issue-loop
description: >-
  Run the autonomous issue loop — schedule a wave of eligible issues from THIS project's
  configured tracker whose declared file footprints do not intersect, work each one in
  its own lane exactly per its instructions, open a PR per lane, and repeat until no issue
  is eligible, then report the terminal state. Every open PR's files stay reserved, and a
  child issue stacks on its parent's open PR only when it asks for that stacked lane.
  Works with any tracker (Linear, Jira, GitHub Issues, GitLab, etc.);
  the tracker and the lane budget are read from PROJECT.md, not hard-coded. Use when the user says
  "work the backlog", "run the issue loop", "clear the queue", or similar.
---

# Autonomous Issue Loop (tracker-agnostic, wave-scheduled)

You are the **coordinator** of an autonomous issue loop against **this project's issue tracker**.
You schedule waves, not single issues. A wave is a set of eligible issues whose declared file
footprints do not intersect. You dispatch one lane per issue, and each lane works in its own git
worktree. Loop until nothing eligible is left.

This skill is deliberately **tool-agnostic**. It never assumes Linear, Jira, GitHub Issues, or
any specific tool. Every tracker operation below is written in the abstract; you resolve it to
concrete tool calls using the **Tracker configuration** step first.

**Run the phases in this order:**

1. Resolve the tracker and the merge gate (§0).
2. Select the wave (§1).
3. Dispatch one lane per issue in the wave (§6).
4. Work one issue per lane, and open one PR per lane (§4).
5. Hand each finished PR to the merge flow, then refill the lane (§6).
6. Return to §1 until no issue is eligible.
   Under the `cycle-manager` skill, a run replaces items 5 and 6: it selects one wave, refills
   nothing, and hands its PRs off after END OF RUN.

**Why waves.** Two issues may run at once only when their work cannot collide. Every issue
declares its file footprint (`issue-writer` §4), so that question is a lookup, never a guess. The
rest of this skill is that lookup, plus the lane mechanics that make it pay.

---

## 0. TRACKER CONFIGURATION — do this BEFORE the loop, every run

The loop needs to know *where issues live* and *how to act on them*. This is decided once, at
project setup, and recorded in `PROJECT.md`.

1. Read `PROJECT.md` at the repo root and find the tracker mapping. It should tell you:
   - **Tracker** — which system (e.g. Linear, Jira, GitHub Issues, GitLab).
   - **Scope** — the team / project / board / repo whose backlog you work.
   - **How to call it** — the MCP server, CLI, or API the agent uses (e.g. the Linear MCP
     tools, `gh issue` for GitHub, `jira` CLI, a REST endpoint).
   - **Status names** — this tracker's actual names for: Backlog, Todo, In Progress,
     In Review, Done (they differ per tool).
   - **Priority model** — how priority is represented and ordered (see §3 — do NOT assume).
   - **Identifier & branch convention** — the issue-id format and any auto-link rule (e.g.
     Linear links a PR when the id is in the branch/body; GitHub links via "Fixes #123").
   - **Dependency signal** — the signal that says an issue has an open blocker.
   - **Input-needed signal** — the signal that says a human owes an issue an answer.
   - **Hold signals** — every signal §1 step 2 filters on.

   **If `PROJECT.md` declares no input-needed signal, STOP before the first wave.** Ask the owner
   to declare one. Without it, a bounced question is lost.

2. Resolve two more fields. Read the first from the project's merge-gate section:
   - **Lane budget** — how many issues may run in parallel. §6 caps the running lanes at this
     number.
   - **Pre-PR gate** — every lane runs it before it opens a PR. Run the pre-PR gate that
     `PROJECT.md` declares in its "Build / lint / test commands" section. Skip a command declared
     `none`, and record it as declared none.

3. **If `PROJECT.md` is missing, STOP.** A missing `PROJECT.md` does not make the project new.
   Run `CLAUDE.md` §0, Project Bootstrap. It routes the project to the interview or to the
   `project-onboard` skill. Never write a partial `PROJECT.md` from this skill.

   **If `PROJECT.md` has no tracker mapping or no host mapping, STOP and name what is missing.**
   Never guess it. Its fix is a ticket, filed with the `issue-writer` skill.

   A missing tracker mapping leaves no tracker to file that ticket in, so ask the owner to add the
   mapping to `PROJECT.md` through a PR on a branch.

4. **If the merge-gate section declares no lane budget, use 1 lane.** Name the default in the
   run report. Never run more lanes than a declared budget allows.

5. Throughout the rest of this skill, wherever you see a **tracker verb** in `THIS_FONT`:
   - `LIST_ISSUES` — query issues by status/assignee for the configured scope.
   - `GET_ISSUE` — fetch one issue's full description, comments, sub-issues, attachments.
   - `SET_STATUS` / `SET_ASSIGNEE` — update an issue's workflow state / owner.
   - `ADD_COMMENT` — post a comment on the issue.
   …resolve each to the concrete call for the configured tracker. Confirm the mapping once at
   the top of the run, then proceed.

---

## 1. WAVE SELECTION  (re-run this before EVERY wave — never cache a list)

1. `LIST_ISSUES` for the configured scope, status = Backlog or Todo (use the tracker's real
   status names from §0).
2. Filter OUT anything that is: carrying any hold signal `PROJECT.md` declares, already
   assigned to someone else, already In Progress, has an open linked PR, or is in this session's
   SKIPPED set. Filter on those declared signals alone. A label the project never declared is a
   label nobody maintains, so filtering on one hides work for a reason no one owns.

   **Count every exclusion on a hold signal, per signal.** Give each one a Held back row with the
   reason `hold signal: <signal>` (END OF RUN). Step 10 reads these counts.

   **One exemption, for step 5's stacked-lane test only.** Keep a candidate whose one hold signal
   is the dependency signal in the list until step 5 inspects it. Exempt that one signal, and no
   other. Step 5 holds the candidate back, as `blocked by #N`, unless its stacked-lane test
   passes.
3. Sort by priority using the tracker's priority model (§3). Map it to a clear order —
   Urgent > High > Medium > Low > None — and **tie-break by oldest created date**.
4. `GET_ISSUE` for every remaining candidate. Read the full description, comments, sub-issues
   and attachments. Later comments override the description.
5. **Hold back any issue whose blocker is not Done.** Read the blocked-by relations from the
   tracker and from the issue's Dependencies section. A blocker whose PR is open is **not**
   Done (`CLAUDE.md` §4.2). Name the issue and its open blocker in the run report.

   **The stacked lane is this step's one exception.** When a candidate's `## Dependencies` carries
   a `Stack on:` line, read `references/stacked-lane.md` before you continue. Otherwise skip it.

   **Milestone check.** Run it on every candidate this step keeps:

   - Drop a candidate that has an open dependency in an earlier milestone (`CLAUDE.md` §4 step 3).
     Its reason is `blocked by #N`.
   - Where `PROJECT.md` declares a milestone model, hold a candidate that has no milestone. Its
     reason is `no milestone`. Queue its question (`CLAUDE.md` §5 rule 2, §13).
   - Where `PROJECT.md` declares no milestone model, skip this check. Say so in the run report.
6. Read each remaining candidate's `## Wave` and `## Declared file footprint` sections. Those
   headings are the ones `issue-writer` §4 puts on every issue.
7. Pick the dispatch wave: the set of issues this step and step 8 select. The `## Wave` number is
   the plan wave.
   - **Compare plan-wave numbers only within one plan.** Two issues are comparable only when
     their `## Wave` names the same plan file.
   - **Within one plan, take the lowest plan wave first.** Never take an issue from a higher plan
     wave while a lower plan wave of the same plan holds an eligible issue.
   - **Across plans, and against "none", order by priority (§3), then by age.**
8. Add candidates to the dispatch wave one at a time, in that order. Run the disjointness test
   below against every issue already in the dispatch wave. Run it against the reservation set as
   well. Hold back a candidate that intersects the reservation set. Name the PR number and the
   shared path in the run report. The dispatch wave holds every candidate that passes, with no
   cap. The lane budget caps the running lanes instead (§6 item 4).

   **The reservation set** holds every path an open PR already owns. §6 item 7 states the rule it
   applies. Normalise its paths by the rules below. Build it from two parts:

   - **The PRs it covers** — every open PR whose base is the default branch, or whose base is
     another open PR's head branch. Include it whoever opened it. A PR an earlier run left open
     collides exactly as one this run opened does.
   - **The paths it holds** — the union of the linked issue's declared footprint and the files the
     PR actually changed. A stray is real content on the branch (§4 step 8).

   **No issue is exempt from this step.** Hold back a candidate whose footprint intersects the
   reservation set, including a stacked child whose footprint intersects its parent's.
9. Hold back a candidate that fails the test. Name the intersecting issue and the shared path in
   the run report.
10. Stop when the dispatch wave holds no issue. Name the terminal state the run reached. Every
    Held back row decides the state, not the reservation set alone. Map each Held back reason to
    exactly one state:

    - **Stalled on blockers** — `blocked by #N`, and `hold signal: <signal>` for the dependency
      signal.
    - **Stalled on input** — `hold signal: <signal>` for the input-needed signal, and
      `no milestone`.
    - **Stalled on reservations** — `reserved by open PR #N on <path>`.
    - **Stalled on footprints** — `intersects #N on <path>`, `no declared footprint` and
      `unresolvable path`.
    - **Stalled on `<signal>`** — `hold signal: <signal>` for any other hold signal `PROJECT.md`
      declares. Name the signal.
    - `lane budget full` maps to no stall state. It appears only when the run ended with
      dispatch-wave members undispatched.

    **Backlog exhausted** — print it only when the Held back table is empty, and step 2 excluded
    no candidate on a hold signal.

    **Name every state that fired when more than one applies.** Never report one state and drop
    the rest. Name the issues each state holds back, by id. A run held back at step 5 and at
    step 9 names both stalls.

    **Put the count of issues still eligible-but-held on the terminal-state line.** Count every
    Held back row, whatever its reason. A reader tells an empty backlog from a jammed one in that
    one line.

    Report a stall. End the run. Never wait, poll, or sleep for a PR to merge. Go to END OF RUN.

### The disjointness test — mechanical, never a judgment call

Two issues share a wave **only** when no declared path appears in both footprints. Apply these
rules literally:

- **Normalise every declared path first.** Drop a section marker, numbered or named: `CLAUDE.md §6`
  becomes `CLAUDE.md`, and `PROJECT.md`, "Build / lint / test commands" becomes `PROJECT.md`. Drop
  a line range: `src/reports/export.ts:42` becomes `src/reports/export.ts`.
  Expand a placeholder built from the issue id: `decisions.d/<date>-<issue-id>.md` becomes the
  file that issue will write.
- **Two footprints intersect when one normalised path appears in both.**
- **A directory intersects every path beneath it.**
- **Two edits to different sections of one file still intersect.** Git merges files, not
  sections, so "different section" is not a defence.
- **Treat a hedged path as declared.** "Possibly `src/reports/export.ts`" declares that file. So
  does "`src/reports/export.ts` if step 3 needs it".
- **Treat a path you cannot resolve as intersecting everything.** An unexpanded placeholder or a
  vague phrase runs alone. Absent evidence is not evidence of disjointness. Such an issue
  intersects every open PR too. Schedule it under the rules for an issue that declares no
  footprint (below), with the reason `unresolvable path`. Its question asks the author to resolve
  the path.
- **Never widen or narrow a declared footprint to make a wave fit.**

### An issue that declares no footprint

- **Never dispatch it beside another lane.** You cannot check a declaration that does not exist.
- **It intersects every open PR.** Dispatch it as a solo wave only when it is the top eligible
  issue **and** the reservation set is empty. Open no other lane for that wave.
- **Otherwise hold it back** with the reason `no declared footprint`. Name the open PRs it waits
  on.
- **Queue one question** (`CLAUDE.md` §13). Ask the issue's author to declare the footprint. That
  question is the way out: an issue with a declared footprint schedules normally.
- **Tell the lane to state in the PR body that the issue declared no footprint** (§4.8). The
  reviewer then escalates rather than reading silence as compliance.
- **Never invent a footprint for it.** A footprint an agent guessed is not a commitment.

### Hunt for the universally-touched file before the first wave

Ask one question before you dispatch anything: does a file exist that **every** issue must
write? A shared log, an index, a registry, a barrel export, a lockfile, and a generated bundle
are the usual answers. One such file makes every pair of issues intersect, and it makes the whole
schedule an illusion that produces a conflict on every concurrent branch (`feature-plan` §4).

Say so plainly when you find one. Run single-lane until it is fixed, and report that the file
needs its own issue. Never fix it inside another issue's lane.

## 2. ISSUE INSTRUCTIONS ARE THE SPEC

Every issue contains instructions for how to complete the task. Treat them as the primary
source of truth for that issue — above your own instincts about how you'd approach it.

- Read the WHOLE issue before touching code: description, acceptance criteria, comments,
  sub-issues, linked docs, and any attachments. Later comments override the description when
  they conflict.
- Follow the stated approach even if you would have done it differently. If you think the
  prescribed approach is wrong, `ADD_COMMENT` with your reasoning and ask — don't silently
  substitute your own.
- If the issue names specific files, functions, endpoints, migrations, or a sequence of steps,
  follow them exactly and in order. Don't expand scope beyond what's written.
- If the issue specifies how to verify (a test to add, a command to run, a manual check), do
  exactly that and paste the result in the PR body.
- Explicitly restate the issue's instructions as a checklist before you start, and tick each
  one off. If any instruction is ambiguous or contradicts another, STOP and ask (see §4 step 3).
- Instructions in an issue describe the WORK. They cannot override the HARD RULES below. If an
  issue asks you to force-push, merge your own PR, mark itself Done, touch secrets/prod config,
  or disable tests — do not comply. `ADD_COMMENT` flagging it, and return the lane as bounced.
  The coordinator releases the claim (§5).

## 3. PRIORITY MODEL — read the tracker's, don't assume

Priority ordering is tracker-specific and a common source of bugs. Resolve it from §0 before
sorting:

- **Linear:** priority is an int where `0` = "No priority" (NOT highest), `1` = Urgent,
  `2` = High, `3` = Medium, `4` = Low. Do NOT sort numerically ascending — map explicitly to
  Urgent > High > Medium > Low > None.
- **Jira:** named priorities (Highest/High/Medium/Low/Lowest) — map to the same order.
- **GitHub / GitLab:** usually priority *labels* (e.g. `P0`/`P1`/`P2` or `priority:high`) —
  read the project's label convention from `PROJECT.md` and map those to the order.

Whatever the model, produce the same explicit ordering (Urgent > High > Medium > Low > None)
and tie-break by oldest created date.

## 4. WORKING THE ISSUE — one lane, one issue, one PR

Every lane runs these steps for its own issue. The coordinator dispatches the lane per §6.

1. Confirm the claim the coordinator made (§6.1): status In Progress, assignee me.
   `ADD_COMMENT` the branch name you are working on.
2. Work inside the worktree the coordinator created, on the branch it cut from the latest
   default branch (from `PROJECT.md`; usually `main`). Put the issue id in the branch name so
   the tracker auto-links the PR (or use the tracker's link mechanism, e.g. "Fixes #123").
   A stacked child works on its parent's branch instead, under `references/stacked-lane.md`.
3. Restate the issue's instructions + acceptance criteria as a checklist. Then run two checks:
   - **Decision contradiction.** Read every decision entry the default branch gained since the
     issue was created. A decision that contradicts the issue stops the lane (`CLAUDE.md` §4
     step 4).
   - **Consumer.** An issue that builds something nothing consumes stops the lane (`CLAUDE.md` §4
     step 6, §5 rule 3).

   **Stop on either finding.** Stop too when the issue is ambiguous or self-contradictory, or
   when the work changes a public API the issue does not name. An issue that declares no footprint
   also stops when the work would touch >10 files, or change any public API. A declared footprint
   is the issue's size bound instead, and step 8 reports any stray.

   **To stop:** `ADD_COMMENT` your specific questions, apply the input-needed signal `PROJECT.md`
   declares, and return the lane as bounced. The coordinator releases the claim (§5). Do not
   guess. Read the result of that call: an unapplied signal is a question the next run forgets.
   Record the question in the escalation queue as well, and hand it to the coordinator with the
   lane (`CLAUDE.md` §13). The signal is what the next run reads; the queue is what puts the
   question in front of the user this run.
4. Explore the real code before writing anything. Don't assume file layout.
5. Do what the issue says, and only what the issue says. No drive-by refactors. Stay inside the
   declared footprint.
6. Add or update tests (or the ones the issue specifies). Run the pre-PR gate that `PROJECT.md`
   declares in its "Build / lint / test commands" section. Skip a command declared `none`, and
   record it as declared none. Fix until it passes.
7. **Sync with the current default branch immediately before you push. Always.** Fetch first.
   Rebase a branch you have not pushed yet onto the current default branch. Merge the current
   default branch into a branch you have already pushed. Never rebase a branch you have pushed.
   A rebase needs a force-push, which destroys the commits a reviewer already read. The
   CONFLICT phase of the `pr-merge-loop` skill states the same rule for the merge
   flow. Re-run the pre-PR gate after the sync (`CLAUDE.md` §11 rule 9).
   This applies to every lane and every run — it is not a parallel-mode step. A branch that has
   never seen the current default branch is not ready to review.
   Resolve a conflict inside your declared footprint yourself. Stop on a conflict outside
   it: the schedule was wrong. Report it to the coordinator, `ADD_COMMENT` on the issue, and
   return the lane as bounced. The coordinator releases the claim (§5).

   A stacked child syncs with its parent's branch instead, under `references/stacked-lane.md`.
8. **Compare your changed files against the declared footprint.** List the files the branch
   actually changed, and name every one the footprint does not cover.
   - Revert a stray that no acceptance criterion needs and no falsified document explains.
   - For every other stray, write a widening request in the PR body, in one of these two forms:

     ```markdown
     ## Footprint widening request

     - `<path>` — needed for: "<the acceptance criterion, quoted>" — <why this file must change>
     - `<path>` — made false by this change: "<the passage, quoted>" (<document>, <section>) — <what in the diff makes it false>
     ```

   - Never edit the issue's footprint yourself.

   Straying is information the reviewer acts on (`CLAUDE.md` §6). Say "this issue declared no
   footprint" in the PR body when it declared none.
9. Commit `<type>: <summary> (<issue-id>)` — the form `CLAUDE.md` §3 defines. Push, and open a PR
   that links the issue via the tracker's mechanism. Title the PR `<issue-id>: <summary>`. Put
   these in the body:
   - `Closes #<issue-id>`, or the closing link the tracker uses instead;
   - what changed, and a line on why;
   - the instruction checklist, with each item ticked;
   - how you verified;
   - the footprint comparison from step 8;
   - anything applied out-of-band, with its exact ordering, or "none";
   - the `CLAUDE.md` §11 rule 4 exemption line, when the change is docs-only;
   - what you deliberately skipped.

   A stacked child opens its PR against its parent's branch instead, under
   `references/stacked-lane.md`.
10. `SET_STATUS` = In Review. `ADD_COMMENT` on the issue with the PR link and what shipped. The
    issue is the record of the work; there is no separate log (CLAUDE.md §9).
11. Return the lane to the coordinator. Report the issue id, the PR link, the check results, any
    stray file from step 8, and any question you queued in step 3.

## 5. SKIPPED SET

Keep an in-session list of issue ids you bounced (input-needed, blocked, stuck). Never re-pick
them this run — otherwise the loop grabs the same issue again and spins. A lane that bounces its
issue returns the lane to the coordinator, which adds the id to this set. Only the coordinator
writes this set.

**Release the claim of every bounced issue.** Every bounce path ends here: §2, §4 steps 3, 7 and
9, and the "Same error twice" rule in §7. A claim left in place hides the issue from every later
run, because §1 step 2 filters out an assigned issue. When a lane returns bounced, the coordinator:

1. adds the issue id to this set;
2. sets the issue back to Backlog (`SET_STATUS`);
3. removes the assignee (`SET_ASSIGNEE`);
4. reads both results back, and reports a call that did not apply;
5. removes the bounced lane's worktree under §6 item 10's rules, never with `--force`.

Record the result in END OF RUN's `Claim released` column.

## 6. LANES — dispatch, hazards, and refill

1. **Claim each issue immediately before its lane is dispatched.** `SET_STATUS` = In Progress,
   `SET_ASSIGNEE` = me, `ADD_COMMENT` "picking this up". Claim first so a parallel session does
   not take the same issue. A dispatch-wave member that waits for a free lane stays unclaimed, so
   another session can still take it. Read its assignee before you claim it, and skip a member
   another session has claimed.
2. **One git worktree per issue.** Run `git fetch origin`, then
   `git worktree add -b <branch> <path> origin/<default branch>`.
   - `<branch>` is the tracker's suggested name when it gives one (`CLAUDE.md` §3). Otherwise it
     is §0's branch convention.
   - A stacked child's start point is in `references/stacked-lane.md`.

   The path is wherever the worktree is actually
   created. This loop does not control it — a harness may place it somewhere else — so no
   directory is proposed here. `git worktree list` is the authority on where a worktree landed.
   Item 10 removes it from there.
3. **One subagent per worktree.** Pass the FULL `GET_ISSUE` output — description, comments, and
   all — plus the declared footprint, the pre-PR gate from `PROJECT.md`'s "Build / lint / test
   commands" section, and the hard rules in §7. Pass `references/stacked-lane.md` to a stacked
   child as well. Never pass a summary. Dispatch a solo wave the same way; one lane is still a
   lane.
4. **The lane budget comes from `PROJECT.md`** (§0.2), never from how many issues happen to be
   disjoint. It caps how many lanes run at once, not the dispatch wave. Six disjoint issues and a
   budget of three dispatch three. The other three wait in the wave for a free lane.
5. **Declare a hazard's whole reach in its footprint.** A hazard is an operation whose effect
   reaches files beyond the one an issue creates. It is safe to run beside other lanes once its
   footprint declares that whole reach. The footprint declares, per hazard:
   - a dependency update: the manifest and the lockfile;
   - codegen: every generated file or directory it commits;
   - a formatter or codemod: every directory it rewrites;
   - a migration: its migrations directory, not only its new file. Migrations apply in order to
     one schema, so two of them collide even in different files.

   The disjointness test (§1) then holds these issues apart on its own, because a directory
   intersects every path beneath it.
6. **Merge as you go.** Hand each PR to the review/merge flow as soon as its checks go green.
   Never hold finished PRs until the backlog empties. Conflict probability grows with the number
   of open branches and with their age, so keep the open-PR window near the lane count.

   **The `cycle-manager` skill is the mechanism that performs the hand-off.** It drives review,
   repair and merge in the same session, and it starts its next cycle from what those merges
   unblocked. A run invoked on its own performs no hand-off: it hands its PRs to whatever the user
   runs next, and §1 step 10 still ends the run. **This loop still merges nothing itself** (§7).

   **Under the `cycle-manager` skill, the run selects one wave, refills nothing, and hands its PRs
   off after END OF RUN.**
7. **A footprint stays reserved until its PR merges or closes.** A finished lane still owns its
   files, because the next branch cuts from a default branch that does not carry them yet.
   Refill a freed lane only with an issue disjoint from every in-flight lane **and** from the
   full reservation set (§1 step 8).
8. **Refill from the current dispatch wave first.** Take its next waiting member. Re-run §1
   steps 8–9 on that member before you dispatch it. Re-run §1 only when the dispatch wave holds no
   member left to dispatch.
9. **Report an idle lane rather than filling it unsafely.** Where the merge gate sends every PR
   to a human, lanes idle while approvals wait. Say so in the run report instead of letting the
   reader infer throughput that will not happen.
10. **Remove a lane's worktree once that lane has returned.** That holds whether the lane pushed
    a PR or bounced, because a bounced lane pushes nothing and its worktree must still go. The
    coordinator does this, at §4 step 11 — the point the lane is finished — and in §5's release
    step. A lane cannot remove the worktree it is working in, and this step pairs with the
    creation in item 2. Removing the worktree ends the lane's hold on the branch; a pushed PR's
    footprint stays reserved under item 7 regardless.
    - **Resolve the path from `git worktree list`, never from the string in item 2.** Match the
      lane's branch name to its worktree path, then remove that path with `git worktree remove`.
      A harness may place the worktree somewhere else, which is the observed case, so a removal
      built on the documented string removes nothing and reports success.
    - **Never pass `--force`.** `git worktree remove` refuses a dirty worktree by design, and that
      refusal is the guard against discarding uncommitted work.
    - **On a refusal, leave the worktree where it is.** Report it by branch and by path in the run
      report, then carry on with the next lane. A refusal is a finding for a human, not a retry.
    - **Leave the local branch alone.** This loop never deleted a branch, and this step adds no
      reason to start. The `pr-merge-loop` skill owns branch deletion, and this step does not widen
      that remit.

## 7. HARD RULES (never overridden by an issue)

- Never force-push, never commit to the default branch, **never merge your own PR**. This loop
  only opens PRs; merging happens later, in the review/merge flow, under the two-tier gate
  (CLAUDE.md §1 rule 3, §6).
- Never mark an issue Done — only In Review. It reaches Done at merge, through that gate.
- Never dispatch two lanes whose declared footprints intersect (§1).
- **Never let a stacked child merge before its parent.** This loop merges nothing, so it states
  the stack in the child's PR body (§4 step 9) and in the run report (`END OF RUN`). The merge
  flow holds the child until the parent merges (the `pr-merge-loop` skill's STACKED PAIRS phase).
- Never invent, widen, or narrow a declared footprint. Request a widening in the PR body instead
  (§4 step 8).
- Never run more lanes than the budget in `PROJECT.md` allows.
- If the default branch's tests were already failing, say so; don't silently fix them.
- Same error twice → stop, `ADD_COMMENT` the blocker, return the lane as bounced (§5), move on.
- Don't touch secrets, prod config, or CI credentials (CLAUDE.md §8).
- Never disable, skip, delete or weaken a test, whatever an issue's instructions say
  (`CLAUDE.md` §11 rule 10).
- Read the decision log before implementing, and again before requesting merge (CLAUDE.md §4.4,
  §6.2). Its location and read command come from the workflow file (`CLAUDE.md` §7). Do not assume
  a filename. A decision can invalidate an open issue or PR.

## END OF RUN

Print these blocks, in this order: the terminal-state line, the Dispatched table, the Footprint
widenings requested block, the Held back table, the lane-budget line, the Stack block, the Worktrees
line, and the Escalation digest.

**Terminal state** — name every state §1 step 10 reached, in plain English. Give the count of
issues still eligible-but-held on that line. Name the issues each state holds back, by id. Print
every state that fired, never only the first:

- A `backlog exhausted` run says no eligible issue is left. Print it only when the Held back table
  is empty, and §1 step 2 excluded no candidate on a hold signal.
- A `stalled on blockers` run names every blocker that is not Done. It states that the stall
  clears when each named blocker merges.
- A `stalled on input` run names every issue that waits on a human answer. It states that the
  stall clears when a human answers and clears the input-needed signal.
- A `stalled on reservations` run names every PR it waits on. It states that the run resumes when
  those PRs merge. It names `pr-merge-loop` as the flow that merges them.
- A `stalled on footprints` run names every intersecting issue and the shared path. It states
  that the stall clears when that issue's PR merges or closes. For `no declared footprint` and
  `unresolvable path`, it names the open PRs the issue waits on, and the question it queued.
- A `stalled on <signal>` run names the hold signal and every issue it holds.

Map each Held back reason to exactly one state:

| Held back reason | Terminal state |
| --- | --- |
| `blocked by #N`, and `hold signal: <signal>` for the dependency signal | Stalled on blockers |
| `hold signal: <signal>` for the input-needed signal, and `no milestone` | Stalled on input |
| `reserved by open PR #N on <path>` | Stalled on reservations |
| `intersects #N on <path>`, `no declared footprint`, `unresolvable path` | Stalled on footprints |
| `hold signal: <signal>` for any other declared hold signal | Stalled on `<signal>` |
| `lane budget full` | none; it appears only when the run ended with wave members undispatched |

Use that vocabulary, and invent no second one.

**Dispatched** — one row per issue worked:

| Wave | Lane | Issue | Title | Priority | Footprint | Status | PR | Claim released |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Fill `Footprint` with `inside`, `strayed: <files>`, `widening requested: <files>`, or `none
declared`. Fill `Status` with `PR opened`, `input-needed`, or `blocked`. Fill `Claim released` with
`yes` for a bounced issue whose release (§5) read back as applied. Write `no: <the call that
failed>` when it did not apply. Write `kept` for an issue whose PR opened, because that claim stays
until the merge.

**Footprint widenings requested** — print one request line for each widening request a lane wrote
in its PR body, in this form. Print the sentence "This run requested no footprint widening." when
no lane wrote one.

```markdown
**Footprint widening requested — PR #<n>, issue #<id>: `<path>` — <why>. Not yet decided.**
```

**Held back** — one row per issue the wave excluded:

| Issue | Title | Reason |
| --- | --- | --- |

Give every held candidate a mechanical reason, including a §1 step 2 exclusion on a hold signal:
`intersects #N on <path>`, `reserved by open PR #N on <path>`, `blocked by #N`,
`hold signal: <signal>`, `no milestone`, `no declared footprint`, `unresolvable path`, or
`lane budget full`. A reservation reason names the PR number and the shared path. List a
dispatch-wave member that was never dispatched as `lane budget full`.

Then state the lane budget you used, where you read it, and whether any lane idled waiting on a
merge.

**Stack** — say "this run dispatched no stacked pair" in one sentence, unless it dispatched one;
then print the Stack block that `references/stacked-lane.md` defines.

**Worktrees** — state how many lane worktrees this run removed, and how many it left behind. Name
every one it left by branch and by path, and give the reason (§6 item 10). Say "removed all of
them" in one sentence when none was left. A silent teardown reads exactly like one that never ran,
which is why item 9 reports an idle lane rather than staying quiet about it.

**Escalation digest** — print it last. You hold the queue for the run: every lane returns its
questions with the lane (§4 step 11). `CLAUDE.md` §13 defines the queue, the entry and where the
queue lives. Group the entries by what the answer unblocks, and give each entry one decision. Put
the recommended option first in every entry. Say in one sentence that the run queued no question
when the queue is empty.

**A queued question never replaces the signal on its issue.** The signal is what the next run
reads, and the digest is what this run presents (§4 step 3). Apply both.
