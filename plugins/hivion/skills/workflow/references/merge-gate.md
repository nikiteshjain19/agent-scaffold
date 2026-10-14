# Merge gate

Pull requests and pre-merge review.

## Opening a pull request

- Title references the ticket ID; body summarizes what changed, why, how it was tested, and
  calls out anything applied out-of-band (e.g. "apply migration X before deploying") with the
  exact ordering.
- Open it in a reviewable state and hand it to the user. **The authoring agent never merges its
  own PR** — merging happens only through the two-tier gate below.
- **Keep the body describing the current diff.** Update the body in the same push that changes what
  the PR would land. A new commit, an amendment and a rebase all trigger this. What must stay true
  is one sentence: the body describes the diff this PR would land **now**, never the intent it
  started with. A body that outlives its diff merges anyway, and then it is the permanent record of
  a change that did not happen.

## Pre-merge checks

**Pre-merge review — required before the PR is handed to the user as ready.** Whoever runs
this review (the implementing agent, or preferably a separate reviewing agent) must check:

1. **Correctness review** — read the full diff critically: logic, edge cases, error handling,
   security, tests actually asserting the behavior. Check the diff for the seven shapes in
   "Picking up a ticket", "Justify every line you write". A line matching one fails this check
   (scaffold D-11).
2. **Decision freshness** — re-read every decision entry the default branch gained since this
   PR's branch point, whatever its date. If any decision changed something this PR touches
   (pricing, schema, naming, architecture, scope), the PR is **stale**: update it to match the
   current decision, or close it with a comment explaining which decision superseded it. A PR
   must never merge in contradiction of a logged decision.
3. **Duplicate check** — scan open PRs and recently merged work for overlap. If another PR
   already implements this (fully or partly), close or rework this one rather than merging a
   duplicate.
4. **Staleness against the default branch** — has the default branch moved since the branch
   was cut? If it has, test the merge without pushing it: merge the default branch into a local,
   detached copy of the PR head, and run the pre-PR gate on the result. A conflict, or a gate that
   fails, fails this check. Merge the default branch into the PR branch itself only to resolve a
   conflict. Never rebase a pushed branch: a rebase needs a force-push, which destroys the commits
   a reviewer already read. Resolve only a mechanical conflict (approval gate rule 6 below). Check
   that files this PR touches weren't restructured on the default branch in the meantime.
5. **Ticket still valid** — re-read the ticket and its comments; confirm it wasn't cancelled,
   descoped, or superseded while the PR was open.
6. **Out-of-band verification** — anything the PR depends on outside the repo (migrations,
   env vars, third-party config) is either already applied and verified live, or explicitly
   listed in the PR body as a pre-merge/pre-deploy step.
7. **Body freshness** — read the PR body against the current diff. Confirm the body describes what
   this PR would land now. A body describing a superseded version of the change is **stale**.
   Update it before the PR merges. Escalate the PR as well (escalation condition 7 below).

All seven apply to **every** PR, in both tiers below — only who signs off changes. Only after all
seven pass is a PR mergeable at all.

## Review record

**The review record — one comment on the PR, and no other surface.** Record the outcome of checks
2–5 and 7 as a comment on the PR. The agent that runs the review posts it. That comment is the only
valid surface for the record. A record written into the PR body does not satisfy this rule. Post the
record in both tiers. Post it whether or not the PR then merges.

**The record is the only durable evidence that the review happened**: "Writing style" refuses a work
log, and "Escalation queue" forbids committing the escalation queue. A missing record and a record
in the body read the same way to a later reader — as a review that never ran. The body carries a
second obligation already, because the body-freshness bullet above makes it track the diff, and one
field cannot hold both (private D-152).

## Escalation conditions

**The gate has two tiers.** A documentation typo and a schema migration do not need the same
scrutiny, and making them share one gate puts the whole cost on the user. Which tier a PR falls into
is decided by the escalation conditions below.

**They are written to be *checked*, not weighed.** Every one is a predicate an agent can evaluate
against the diff, the check results, and the ticket — not a judgment about how risky the change
feels. And the tie-break is fixed:

> **If a condition cannot be evaluated, it counts as met and the PR escalates.** Missing data, an
> undeclared field in `PROJECT.md`, a check that did not report — all of it reads as escalate.
> **Absent evidence is not evidence of safety.** A tier that resolves ambiguity in favour of merging
> is worse than no tier at all, because it looks like a gate while being one only when convenient.

**The escalation tier — a human decides.** A PR escalates if **any** of these hold:

1. **It touches a risk-list path** — the globs in the project's Merge gate section (`PROJECT.md`).
   This holds even on a fully green signal; that is the point of the list.
   **A glob matches a path, never a change type.** It cannot tell an added file from a modified
   one. So a risk-list entry may name the change types it covers, such as "modified or deleted".
   Read each matched file's change type from the diff. Count a rename as a deletion of the old path
   and an addition of the new one. An entry that names no change type covers every change type. A
   change type you cannot read counts as covered.
2. **The green signal is not green** — any required job failing, pending, cancelled, **or not
   reported at all**. No checks reported is red, never "nothing to fail". Re-poll before concluding
   the set is empty; checks absent within a minute of a push are usually a race.
3. **The diff strays outside the issue's declared file footprint.** This condition applies in every
   project, and no project can switch it off. A ticket that declares no footprint fires it, and so
   does a footprint entry that names no path. A path outside the footprint does not fire this
   condition when the independent reviewer approved a widening for it. The reviewer approves only a
   path the PR body requests, and that no risk-list entry matches. The path must also meet one of
   two needs: an acceptance criterion needs it, or the change makes a document there false
   ("Dependencies and build order", rule 6). For a document, the reviewer reads it and confirms the
   diff makes the quoted passage false. The agent that requests a widening never approves it. In the
   escalation tier, the owner's approval of the PR approves every extra file its review card names.
   That approval never overrides another escalation condition or a hard stop. Straying is usually
   scope creep and occasionally a mis-scoped issue; either way a human should see it.
4. **A test is deleted, skipped, or weakened** ("Testing policy", rule 10). No issue's instructions
   override this. Two weakening moves are the common ones, and each fires this condition:
   - a snapshot or expected-output fixture updated so that it matches the new output;
   - a threshold, tolerance or timeout loosened until the assertion passes.

   A snapshot update is legitimate when the output changed on purpose and the PR body says so. It
   still fires this condition. It is a finding the PR explains, never an edit to wave through.
5. **The diff exceeds the project's declared size threshold** — or **the project declares no
   threshold**, in which case this condition is met by default and nothing auto-merges until one is
   declared in the Merge gate section.
6. **The independent reviewing agent returned anything other than approve** — including having not
   run, or having been the PR's own author. That agent is the `pr-reviewer` skill; a project where
   no agent can invoke it has no approve verdict available, so this condition is met by default.
   Decide that by "Skill addressing", never by looking for a file.
7. **A record this PR carries is stale** — the ticket, the PR body, or a decision-log entry
   postdating the branch and touching what this PR changes. **A body that contradicts its diff
   fires this condition.** Never note it as a finding and wave the PR through.
8. **The diff can cause an effect a revert cannot undo.** The test: a revert of this commit returns
   the system to its prior state, with no action needed outside the repository. If it does not, this
   condition fires. These are the shapes it covers:
   - data deleted, dropped or truncated, and a migration that is not reversible;
   - a message sent to a person — an email, an SMS, a push, or a webhook to a third party;
   - money moved, or spend incurred, including a paid API call in a new code path;
   - a credential, key or token rotated, revoked or published;
   - an external resource destroyed — a bucket, a queue, a DNS record, or an account.

   This condition reads the effect, never the path. It fires even when no risk-list path is touched
   (scaffold D-12).

## Approval gate

**An escalated PR merges only under the approval gate.** Agents may perform the merge, but only
under all of these:

1. **Explicit, per-PR approval.** The user must approve *that specific PR*, identified by number
   or title. Silence, "looks good" on a different PR, approval of an earlier PR in the same
   session, or a general "keep going" is **not** approval. There is **no standing or blanket
   approval** — each merge needs its own go-ahead.
2. **Not your own PR.** Merging is done by the review/merge flow (the `pr-merge-loop` skill, or a
   separate reviewing agent), never by the agent that authored the branch. An implementing agent
   opens the PR and stops. **A mechanical resolution commit pushed under rule 6 below does not make
   the merging agent the PR's author.** The user ratified that on 2026-07-31 (private D-77). The
   exemption covers that resolution commit and nothing else. Escalate the PR whenever you cannot
   tell your resolution commit apart from other work you wrote on that branch. An independent
   reviewer must still return a fresh verdict on the resolved head SHA. In the auto tier, that
   verdict must be approve. **A repair commit pushed under the repair block below is not covered by
   that exemption, and it does make you the author** (private D-157). The two commits are
   deliberately treated differently: a mechanical resolution carries no intent of yours, and a
   repair is work you wrote.
3. **Approval follows a presented review, and a question the user can answer.** Before asking,
   present a plain-language summary of what the PR changes and the outcome of the seven pre-merge
   checks above. **Plain language governs every finding, not only the summary.** A condition
   number, a check number or a section reference is a citation. It is never an explanation, and it
   never stands alone. Reconcile the findings into one sentence naming what decides this merge.
   Say in the open when two of them disagree, and name the one that decides. Then ask one question.
   Name each answer and what it causes. **Approval given without that review is not valid.** **An
   approval asked without a plain question is not validly asked**, and the approval it produces is
   not valid either. Both failures void the approval, so present the review, ask the question, then
   wait.
4. **Approval expires when the diff changes.** New commits, a rebase that alters the diff, or a
   BASE move that changes what would land invalidate the approval: re-present and re-ask.
5. **After merging**, use the merge strategy from `PROJECT.md`, then update the ticket to its
   merged/Done state and comment the PR link + merge commit SHA on it. If the ticket update
   fails, report that — never guess a different ticket or state. Then sweep the dependents, per the
   block below.
6. **Never merge to resolve uncertainty.** Failing checks, a locked/conflicting pair of PRs, or a
   stale ticket mean stop and report — not merge "to see what happens." Never merge *through* a
   conflict either. The merging agent may resolve a **mechanical** conflict first, on the PR
   branch. Push the resolution. Re-run the checks. Re-present the PR for review on its new head
   SHA. Resolve nothing else. An `intent` conflict, a locked pair, or a conflict you cannot
   classify still means stop and report. The mechanical/intent boundary is defined in the CONFLICT
   phase of the `pr-merge-loop` skill, and is not restated here. It bounds pre-merge
   check 4 above too, which tells a reviewer to merge the default branch in and resolve conflicts.

## Repair

**Repair — the merge flow may fix a defect, and then it may not merge that PR.** Reporting a defect
and handing the PR back to its author costs a whole session for a fix an agent can make in the run
that found it. The merging agent may push repair commits to a PR branch instead. Repair only
a defect on the first list. Never repair anything on the second. **Repair every repairable finding
you find, in as many passes as it takes** — a half-repaired record is worse than an unrepaired one,
because the passages you fixed make the ones you missed read as checked (private D-168).

**Repairable — the PR is simply wrong until someone fixes it:**

1. A required check that fails because of this diff.
2. A PR body that no longer describes the diff (pre-merge check 7).
3. A correctness defect in the diff (pre-merge check 1).
4. A missing test, or a missing failure-branch test, that "Testing policy" rules 1–3 require.
5. A document this change makes false ("Dependencies and build order", rule 6), where the issue's
   footprint already names it.

**Never repairable — a policy flag or a scope decision, and neither is a defect:**

1. A risk-listed path (escalation condition 1).
2. A footprint stray (condition 3).
3. A deleted, skipped or weakened test (condition 4).
4. A diff over the size threshold (condition 5).
5. A cancelled, descoped or superseded ticket, or a decision entry that contradicts the PR
   (condition 7).
6. An effect a revert cannot undo (condition 8).
7. An `intent` conflict, and a locked pair.
8. A PR whose own work you authored.

Repairing one of those either changes nothing or decides scope on the user's behalf. Scope is the
user's to decide, and a condition that fires on a correct PR is not asking to be fixed.

**A repair commit makes you the PR's author.** Never merge that PR, in either tier, on any verdict.
You cannot obtain a verdict on it either: the `pr-reviewer` skill refuses an invocation from the
branch's author, and that refusal survives one level of indirection. Hand the PR off, and say you
repaired it. A later session that did not write the repair reviews it as part of the diff.

**A repair record escalates a PR only when the repairer is the merger.** State the one condition
plainly: the merging agent wrote no commit on this branch. A merging agent that wrote the repair
escalates that PR, in this run and in every later one. The record alone does not escalate a PR whose
repair the merging agent did not write (private D-163).

**Verify these three, and assume none of them.** Each is already required elsewhere, so the
conditional form adds no new bar:

1. **A fresh independent reviewer returned approve on the repaired head.** Escalation condition 6
   already requires that of anything in the auto lane.
2. **The repair stayed inside the five repairable shapes above, and inside the issue's declared
   footprint.** The REPAIR phase bounds already require both.
3. **Every other escalation condition cleared on its own.**

**What does not change — read this before taking the relaxation wider.** A repair still confers
authorship. An agent still never merges a PR it repaired. No escalation condition is relaxed, so a
repaired PR on a risk-listed path still escalates.

**Never weaken, skip or delete a test to make a repair pass** ("Testing policy", rule 10). No
finding overrides that rule, and a repair is not an exception to it.

**Never repair to resolve uncertainty.** A defect you cannot classify escalates, exactly as an
unclassifiable conflict does.

The REPAIR phase of the `pr-merge-loop` skill defines the bounds — the obligation to repair every
repairable finding, the footprint limit, the pre-PR gate, one commit and one push per pass, and the
record each pass leaves behind. They are not restated here.

## Dependent sweep

**Sweep the dependents after every merge.** The merge that completes a ticket is the moment its
dependency signals stop being true, and the merging flow is the only actor that knows the merge
happened. Run this immediately after rule 5's ticket update, in both tiers:

1. Find every ticket that declares the merged ticket as a blocker. Use the tracker's own dependency
   relation, and the Dependencies section of the ticket where the project writes one.
2. Clear the dependency signal on a ticket whose blockers are now **all** complete. The signal, and
   the calls that read and clear it, come from `PROJECT.md`.
3. Keep the signal on a ticket that declares another blocker still open. Comment which blockers
   remain, and name each one.
4. Leave the signal alone whenever you cannot confirm that every blocker is complete. Report that
   ticket by id. **Never clear a signal you cannot verify.**
5. Sweep only the tickets blocked by the ticket you just merged. Touch no other ticket.
6. Report the sweep: the tickets you cleared, the tickets you kept, and the tickets you left
   unswept.

**Never assume a tracker call succeeded.** Read the result of each one. Name every ticket the sweep
could not reach, and the error it returned. A signal left set after its blocker completes is worse
than untidy: the loops that schedule work filter on exactly that signal, so a stale one hides an
eligible ticket from them indefinitely, and the backlog looks emptier than it is.

## Auto-merge tier

An agent may merge without asking. A PR reaches this tier only when **none** of the eight escalation
conditions holds, and **all** of these are true:

- the seven pre-merge checks above pass;
- the green signal is genuinely green, confirmed by reading the check results rather than assuming
  them;
- an **independent** reviewing agent — not the PR's author — returns approve;
- the diff stays inside the issue's declared footprint, or each path outside it carries a widening
  the independent reviewer approved;
- no risk-list path is touched;
- the PR carries no repair record **this merging agent wrote**. A record left by another agent does
  not bar this lane, and the repair block above states what the merger verifies instead.

Two rules never relax, in either tier: **an agent never merges a PR it authored**, and **no agent
ever merges to resolve uncertainty**. After merging, the post-merge steps in the approval gate above
apply unchanged — ticket updated, PR link and merge SHA commented, dependents swept.

**No green signal ⇒ no auto-merge tier** — "Project bootstrap" states this rule, and it binds here
unchanged. Never reinterpret this section to grant yourself autonomy.

## Enforcement

**Enforcement is honoured, not enforced — read this before trusting the tiers.** Where the repo host
does not support required status checks, nothing server-side stops a red PR being merged. The tiers
above are honoured by the merging agent reading check status itself and refusing on anything other
than success. The project's Merge gate section states which of the two situations applies. This is
an accepted limitation, not a reason to relax any condition above.
