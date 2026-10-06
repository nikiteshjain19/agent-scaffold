# CLAUDE.md — Standard Project Workflow

Workflow rules for Claude (and any coding agent) working in this repository. These rules are
tool-agnostic: the concrete tools (ticket tracker, repo host, CI, etc.) for THIS project are
defined in `PROJECT.md` at the repo root. If `PROJECT.md` does not exist yet, run the
**Project Bootstrap** (§0) below before doing anything else. A missing `PROJECT.md` does not
make the project new: §0 decides that first.

---

## 0. Project Bootstrap — run when `PROJECT.md` is missing, or the user says "start new project"

**Route first.** Choose the path from the state of the repository, before you ask any interview
question. A missing `PROJECT.md` means only that the workflow is not adopted yet. The words
"start new project" start this section, and never choose its path.

**The two paths:**

- **A new project** runs the interview below, as written.
- **An existing project** runs the `project-onboard` skill instead of the interview. That skill
  asks the seven topics below of a project that already exists, and writes `PROJECT.md` itself.

**The test that chooses — mechanical, not a judgment.** The project is existing when either
condition holds. It is new when neither holds.

- **The repository has a commit that is not its own scaffolding.** List every path the history
  touches: `git log --format= --name-only | sort -u`. Ignore any empty line in the output. The
  condition holds when any path is outside the scaffolding set. That set is `CLAUDE.md`,
  `STYLE.md`, `PROJECT.md`, `README.md`, `LICENSE`, `.gitignore`, `decisions.d/` and `.claude/`.
  A repository with no commit yet does not meet it. There the command fails, and that failure
  reads as "not met", never as unreadable history.
- **The tracker holds an open issue.** Ask the owner which tracker holds the project's issues.
  Count its open issues. The condition holds when the count is above zero. It does not hold when
  the owner names no tracker.

**Ask the owner when the test is ambiguous.** Treat the test as ambiguous in each of these cases:

- you cannot read the repository's history;
- you cannot reach the tracker the owner names;
- the result contradicts how the owner describes the project;
- the `project-onboard` skill's own precondition check disagrees with this test.

**Never default to the new-project path.** The interview on an existing repository writes a
confident, wrong `PROJECT.md`, and every later agent trusts it. Adoption on a nearly empty
repository only reports little.

**The new-project path.** Do NOT start coding. Conduct a structured interview first, one
topic at a time, covering:

1. **Product** — name, one-line purpose, who it's for, what "done" looks like for v1.
2. **Toolchain** — **where issues are managed** (the ticket tracker — Linear, Jira, GitHub
   Issues, GitLab, etc. — and the team/project/board/repo name inside it), repo host, CI,
   hosting, database, payment/email/other services, and the exact commands for build, lint,
   and test. For the tracker, capture enough for an agent to drive it unattended: how the
   agent reaches it (MCP connector / CLI / API), this tracker's real status names
   (Backlog / Todo / In Progress / In Review / Done), its priority model, its
   issue-id + PR auto-link convention, its dependency mechanism (native relations or text), its
   dependency signal, and the owner's identity on the tracker. The `issue-loop` skill reads exactly
   this mapping, so record it in `PROJECT.md` in enough detail to run the loop.
3. **Branching** — default branch name, branch naming convention, who merges (default: the two
   tiers of §6 — an escalated PR merges only after explicit per-PR human approval, a PR that trips
   no escalation condition may merge after an independent approve, and no agent merges its own PR).
4. **Build sequence** — milestones / week-by-week order, and any hard "ship X before Y" rules.
5. **Constraints** — budget caps (especially AI/API spend), compliance needs, secrets
   categories, non-negotiables.
6. **Working style** — async-first preferences, how much autonomy agents get, when to ask
   vs. decide.
7. **Merge gate** — what makes a change safe to merge without a human reading it. Capture: the
   exact command or check that produces a trustworthy **green signal**; which paths are
   **high-risk** and always need a human regardless (start from the default risk list below);
   whether the repo host **enforces** checks server-side (required status checks / branch
   protection) or whether the gate is only honoured by whoever merges;
   how many issues may be worked **in parallel**; and whether a PR straying outside its issue's
   declared file footprint escalates. Record it as a Merge gate section in `PROJECT.md` — the
   review/merge flow reads exactly this to decide what it may merge unattended.

**The default risk list — propose it in topic 7, in two parts.** Without a default, a project
protects either too little or too much (scaffold D-12).

**Always risk-listed, in every project** — the files that decide how agents behave, and the record
of why:

- `CLAUDE.md`, `PROJECT.md` and `README.md`;
- a modified or deleted entry in the decision log directory (`decisions.d/`), never an added one;
- the project's agent configuration, including any skills or agent definitions it holds;
- CI and deployment configuration.

**A new decision entry is an ordinary change.** A new entry binds only through the files it changes.
A decision that changes the gate, a spend cap or the risk list also edits `CLAUDE.md` or
`PROJECT.md`. Those files stay risk-listed, so that decision still escalates (scaffold D-27).

**An edit to an existing decision entry always escalates.** That includes a `Supersedes` or
`Corrects` back-reference (§7). Such an edit switches off or rescopes a rule agents follow today. A
deleted entry always escalates too, because the log is append-only (§7).

**Write the change types beside the glob.** A glob alone matches an added entry too. Record the
line in the Merge gate section as `decisions.d/**`, modified or deleted only. Escalation condition 1
applies that qualifier (§6).

**Risk-listed when the project has them** — a worked example an application repo can copy:

- migrations and schema;
- auth and session;
- billing and payments;
- entitlements and access control;
- secrets;
- dependency manifests and lockfiles;
- public API contracts;
- cost and infrastructure configuration;
- personal-data deletion, export or retention;
- feature-flag defaults.

**Documentation outside the risk list is an ordinary change.** A docs-only diff outside the list
reaches the auto lane whenever no escalation condition fires. That means a green signal, an approve
verdict, a diff inside the footprint, and a diff inside the size threshold. Nothing about a docs
change is special, and nothing about it is exempt.

**Classify by path, never by what the PR calls itself.** A diff described as a doc fix that edits a
risk-listed file is a risk-listed change. Escalation condition 1 reads the diff (§6).

**Ask which documentation is load-bearing.** Some documentation changes behaviour: a runbook, an API
contract, a published policy, a prompt an agent executes, or an `.env.example`. Ask the project
whether any of its documentation falls in that class. Risk-list each such path by name.

Then generate, commit (via a ticket + PR like any other change), and keep maintained:

- **`PROJECT.md`** — the project document: everything from the interview, structured so an
  agent can read it cold and know the product, stack, toolchain mapping (which tracker,
  which repo, which commands), milestones, metrics, and constraints. **Cite a `PROJECT.md`
  section by its name, never by its number** — every project generates its own and renumbers it,
  so a number in a skill or a doc rots. `CLAUDE.md` is the exception: its numbering is fixed by
  this scaffold, so keep citing it as `§N` (private D-37).
  **Use the section names the skills read.** Name them "Toolchain", "Build / lint / test
  commands" and "Merge gate", with a "Parallelism" section inside "Merge gate". Skills find
  these sections by name, so a renamed section reads as a missing one.
  File the ticket that writes this file under the `issue-writer` skill's bootstrap exception.
- **`decisions.d/`** — the decision log, one file per decision, seeded from any decisions made
  during the interview (see §7 for format). Read it by reading the directory.
- Initial milestones and tickets in the tracker, with dependencies linked (§5). File each ticket
  with the `issue-writer` skill (§2).

**Hard rule — no green signal, no auto-merge tier.** A project whose Merge gate section declares
no green signal has **no** automated merge path: every PR stays human-gated until a real check
exists. A merging agent must treat *no checks reported* as red, never as "nothing to fail" —
absent evidence is not evidence of safety. Autonomy is earned by building the check, and a
project cannot grant itself autonomy it has not earned.

If the user's answer to any interview topic is "you decide", record the choice you made as a
decision in `decisions.d/` so it is visible and reversible.

---

## 1. Golden rules (the short version)

1. **No ticket, no code.** Every change starts with a ticket in the tracker.
2. **No direct pushes to the default branch.** Every change goes through a feature branch
   and a pull request — no matter how small.
3. **Agents merge only through the two-tier gate in §6.** An escalated PR merges only after the
   user explicitly approves *that specific PR*. A PR that trips no escalation condition may merge
   without asking, once an independent reviewer approves it. No agent ever merges a PR it authored.
4. **Read the decision log before implementing and again before requesting merge**
   (`decisions.d/`, §7). A decision made after a ticket or PR was written can invalidate it.
5. **Never build an artifact ahead of its consumer.** No table, column, endpoint, or
   entitlement that nothing in the current codebase (or same-milestone work) uses.
6. **Never print secrets.** Not even to "verify" them.
7. **When in doubt, ask.** A question is cheap; unwinding wrong work is not.

---

## 2. Ticket workflow

- **Every piece of work has a ticket** — features, bugs, refactors, docs, config. Create the
  ticket before you start work. Create every ticket with the `issue-writer` skill. The ticket that
  writes `PROJECT.md` uses that skill's bootstrap exception. Never write a ticket by hand. The loop
  skills read only the headings that skill writes. When this session cannot invoke the skill
  (§12), stop and ask the user. Never fall back to a hand-written ticket.
- **Mark the ticket "In Progress" the moment work starts** — before the first commit, not
  after. Don't batch status updates to the end.
- **Mark it "Done" only when the PR is merged** (or, for non-code tickets, when the deliverable
  is confirmed complete). Wherever the tracker supports it, link the PR to the ticket (e.g.
  "Closes TICKET-ID" magic words) so the merge itself closes the ticket. Never mark Done while
  the PR is still open.
- **Comment material findings on the ticket** — blockers found, scope corrections, decisions
  needed. The ticket is the record of the work, not the chat transcript.
- **When creating tickets, set dependencies up front** (see §5).

## 3. Branch & git workflow

- **Branch per ticket.** Use the tracker's suggested branch name when it provides one;
  otherwise `type/ticket-id-short-description` (e.g. `feat/ABC-12-report-export`). Branch
  from the up-to-date default branch.
- **Never commit or push directly to the default branch.**
- **Write every commit message as `<type>: <summary> (<ticket-id>)`.** `<type>` is a
  conventional-commits type — `feat`, `fix`, `docs`, `chore`, `refactor`, or `test`. A repo whose
  ticket ids read `#N` writes `docs: add merge gate section (#18)`.
- **PR titles are a separate convention and stay as they are** (`<ticket-id>: <summary>`) — never
  align one to the commit form.
- **Before opening a PR: run the project's build, lint, and test commands** (as listed in
  `PROJECT.md`) and only open the PR once all pass.
- **Stacked PRs** are allowed when work genuinely depends on an unmerged PR — say so
  explicitly in the PR body ("stacked on #NN").

## 4. Picking up a ticket — agent implementation protocol

Before writing any code, an agent picking up a ticket must, in order:

1. **Read the full ticket** — description, acceptance criteria, and ALL comments (comments
   often contain scope changes that supersede the description).
2. **Check "Blocked by" relations.** If any blocker is not Done, do not start — leave a short
   comment naming the open blocker and pick something else. The one exception is a stacked child
   lane. The `issue-loop` skill dispatches it beside its parent, under the conditions in its §1
   step 5. Its PR stacks on the parent's PR (§3).
3. **Check milestone order** (§5). Don't pull a later-milestone ticket past an open
   earlier-milestone dependency.
4. **Read the decision log** (`decisions.d/`, §7) — specifically any entry dated after
   the ticket was created, and any entry touching the same area. If a decision contradicts the
   ticket, stop and flag it on the ticket before implementing.
5. **Read `PROJECT.md`** and any architecture doc it points to, so the change fits the
   existing design rather than inventing a parallel one.
6. **Confirm the consumer exists** for anything you're about to build (§5, rule 3).
7. **Plan briefly, then implement** — smallest change that satisfies the acceptance criteria.
   Scope creep goes in a new ticket, not the current branch. File that ticket with the
   `issue-writer` skill (§2). Justify every line you write (below).
8. **Verify like a skeptic**: run build/lint/tests; for changes applied out-of-band (DB
   migrations, dashboard config, DNS, third-party settings), verify the live system actually
   reflects them — a file existing in the repo does NOT mean the change exists in production.
   Silent-failure APIs (clients that return errors instead of throwing) must have their error
   results checked explicitly.
9. **Open the PR** (§6) and update the ticket. The ticket is the record of the work: comment what
   shipped, and let the PR link close it (§2).

**Justify every line you write.** Rule 7 limits what a change covers. This rule limits what it
carries. Give every line in the diff one of these four reasons:

- the acceptance criteria require it;
- an existing caller needs it;
- a test covers it;
- it repairs a defect the ticket names.

"It might help" is not a reason. Remove a line that has none. These seven shapes have none, and a
reviewer checks the diff for each one (§6, pre-merge check 1):

1. **A comment that restates its code.** `// increment the counter` above `counter++` says what,
   not why.
2. **A guard against a state the code cannot reach, with no test that exercises it.** A real guard
   has a failure-branch test (§11 rule 7).
3. **A helper, parameter, option or config key with one caller, or none.** This is §5 rule 3,
   applied inside a file.
4. **An abstraction for a second case that does not exist yet.**
5. **Code the change replaced, left in place** — a dead branch, a superseded function, or a
   commented-out block.
6. **Error handling that catches and does nothing**, or catches and re-throws unchanged.
7. **A docstring or block comment that restates a signature** the reader can already see.

A line that matches a shape has no reason, unless the acceptance criteria name it explicitly. An
existing caller or a test never outweighs a shape.

**What this rule does not cover:**

- **It is not a line count.** A long diff is fine when every line earns its place.
- **It never covers a guard that has a test.** §11 rule 3 requires exactly those guards on
  high-stakes paths.
- **It never covers a test.** Tests are part of the change (§11). A test that looks repetitive is
  usually correct.
- **It never covers documentation that says more than the code shows.** Shapes 1 and 7 catch only
  restatement.
- **It judges the diff, never the code around it.** Cleaning up neighbouring code is scope creep
  (rule 7).
- **It governs code, never the prose of a document or a skill.** `STYLE.md` governs prose (§9).

## 5. Dependencies & build order

These rules exist because out-of-order work creates "orphan" artifacts — infrastructure with
no consumer — that later work has to detect and remove. That is pure waste, twice.

1. **Check blockers before starting** (§4.2).
2. **Respect milestone order.** Tickets are grouped under build-sequence milestones. If a
   ticket has no milestone and its ordering is unclear, ask before starting.
3. **Never build an artifact ahead of its consumer.** Before creating a DB table/column,
   endpoint, entitlement, or config surface, confirm something in the *current* codebase will
   read or write it — or that the consuming feature ships in the same cycle under the same
   milestone. If nothing consumes it yet, stop: flag the missing consumer on the ticket and
   confirm scope before proceeding.
4. **Link dependencies at ticket-creation time.** If one story produces infrastructure another
   consumes, link them blocks/blocked-by and put both in the same (or correctly ordered)
   milestone. No free-floating infra tickets. File the ticket with the `issue-writer` skill (§2).
   Its Dependencies section records the links.
5. **When in doubt about order or consumers, ask before making schema changes.** Wrong-order
   schema changes are expensive to unwind.
6. **Name every document your change makes false.** Changes to the commands, the CI jobs, the file
   layout, the directory contents, or the toolchain trigger this rule. Check `PROJECT.md`,
   `README.md`, `CLAUDE.md`, `STYLE.md`, every skill, and the decision log. Declare each falsified
   document in the issue's footprint, naming the section. Fix it in the same PR as the change,
   never in a follow-up ticket. Declaring it is what makes the repair in-scope: a PR that repairs a
   document its issue declared is not straying (`PROJECT.md`, "Merge gate").

## 6. Pull requests & pre-merge review

**Opening a PR:**

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

**Pre-merge review — required before the PR is handed to the user as ready.** Whoever runs
this review (the implementing agent, or preferably a separate reviewing agent) must check:

1. **Correctness review** — read the full diff critically: logic, edge cases, error handling,
   security, tests actually asserting the behavior. Check the diff for the seven shapes in §4,
   "Justify every line you write". A line matching one fails this check (scaffold D-11).
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

**The review record — one comment on the PR, and no other surface.** Record the outcome of checks
2–5 and 7 as a comment on the PR. The agent that runs the review posts it. That comment is the only
valid surface for the record. A record written into the PR body does not satisfy this rule. Post the
record in both tiers. Post it whether or not the PR then merges.

**The record is the only durable evidence that the review happened**: §9 refuses a work log, and §13
forbids committing the escalation queue. A missing record and a record in the body read the same way
to a later reader — as a review that never ran. The body carries a second obligation already, because
the body-freshness bullet above makes it track the diff, and one field cannot hold both
(private D-152).

### The gate has two tiers

A documentation typo and a schema migration do not need the same scrutiny, and making them share one
gate puts the whole cost on the user. Which tier a PR falls into is decided by the escalation
conditions below.

**They are written to be *checked*, not weighed.** Every one is a predicate an agent can evaluate
against the diff, the check results, and the ticket — not a judgment about how risky the change
feels. And the tie-break is fixed:

> **If a condition cannot be evaluated, it counts as met and the PR escalates.** Missing data, an
> undeclared field in `PROJECT.md`, a check that did not report — all of it reads as escalate.
> **Absent evidence is not evidence of safety.** A tier that resolves ambiguity in favour of merging
> is worse than no tier at all, because it looks like a gate while being one only when convenient.

### Escalation tier — a human decides

A PR escalates if **any** of these hold:

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
3. **The diff strays outside the issue's declared file footprint**, where the project has footprint
   enforcement on. Straying is usually scope creep and occasionally a mis-scoped issue; either way a
   human should see it.
4. **A test is deleted, skipped, or weakened** (§11 rule 10). No issue's instructions override this.
   Two weakening moves are the common ones, and each fires this condition:
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
   Decide that by §12, never by looking for a file.
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
   reviewer must still return a fresh approve on the resolved head SHA. **A repair commit pushed
   under the repair block below is not covered by that exemption, and it does make you the author**
   (private D-157). The two commits are deliberately treated differently: a mechanical resolution
   carries no intent of yours, and a repair is work you wrote.
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
4. A missing test, or a missing failure-branch test, that §11 rules 1–3 require.
5. A document this change makes false (§5 rule 6), where the issue's footprint already names it.

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

**Never weaken, skip or delete a test to make a repair pass** (§11 rule 10). No finding overrides
that rule, and a repair is not an exception to it.

**Never repair to resolve uncertainty.** A defect you cannot classify escalates, exactly as an
unclassifiable conflict does.

The REPAIR phase of the `pr-merge-loop` skill defines the bounds — the obligation to repair every
repairable finding, the footprint limit, the pre-PR gate, one commit and one push per pass, and the
record each pass leaves behind. They are not restated here.

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

### Auto-merge tier — an agent may merge without asking

A PR reaches this tier only when **none** of the eight escalation conditions holds, and **all** of
these are true:

- the seven pre-merge checks above pass;
- the green signal is genuinely green, confirmed by reading the check results rather than assuming
  them;
- an **independent** reviewing agent — not the PR's author — returns approve;
- the diff stays inside the issue's declared footprint;
- no risk-list path is touched;
- the PR carries no repair record **this merging agent wrote**. A record left by another agent does
  not bar this lane, and the repair block above states what the merger verifies instead.

Two rules never relax, in either tier: **an agent never merges a PR it authored**, and **no agent
ever merges to resolve uncertainty**. After merging, the post-merge steps in the approval gate above
apply unchanged — ticket updated, PR link and merge SHA commented, dependents swept.

**No green signal ⇒ no auto-merge tier** — §0 states this rule, and it binds here unchanged. Never
reinterpret this section to grant yourself autonomy.

**Enforcement is honoured, not enforced — read this before trusting the tiers.** Where the repo host
does not support required status checks, nothing server-side stops a red PR being merged. The tiers
above are honoured by the merging agent reading check status itself and refusing on anything other
than success. The project's Merge gate section states which of the two situations applies. This is an
accepted limitation, not a reason to relax any condition above.

## 7. Decision log — `decisions.d/`

An append-only log of every decision that shapes the project: pricing, architecture, naming,
scope cuts, tool choices, policy changes. **One decision per file**, `decisions.d/<YYYY-MM-DD>-<id>.md`,
written on the branch of the ticket that produced it.

**Read the log by reading the directory.** Filename order is chronological, so the files in order
are the log. Assemble them into one document however the project likes. The format needs no
particular reader, and a project that wants a tool writes its own.

**Never commit an assembled view.** A committed assembled file reintroduces the collision the
directory removes. Regenerating it after a merge would also be a direct commit to the default
branch.

- **When to log:** any time the user makes or changes a decision in conversation, and any time
  an agent makes a judgment call the user delegated. If it would change how a future ticket is
  implemented, it's a decision — log it.
- **The id comes from the issue, not from a counter.** A decision arising from issue `#N` is
  `D-N`, in `decisions.d/<date>-N.md`. A second decision from one issue is suffixed — `D-Nb`.
  **Never take "the next free number":** two branches guessing simultaneously either collide on
  the filename, or — worse — pick different filenames while both claiming the same id in the
  heading, which git merges silently into two decisions sharing one id. The tracker assigned the
  issue number before either branch existed, so an issue-derived id cannot collide.
  **Two entries must never claim one id.** That is an obligation on the project, not on a tool.
  Enforce it however the project likes — refusing to assemble a log that holds a duplicate id is
  one way.
- **Legacy ids stay as they are.** A log may hold entries a counter numbered before this rule.
  Those entries keep their ids. Never renumber one: §7 is append-only. Such a log's id vocabulary
  is permanently mixed — sequential for the early entries, issue-derived after. **That is correct,
  not a defect to tidy up.**
- **A citation names its log.** An id alone does not say which log holds the entry, and two logs
  can each hold an entry with the same id. Write every citation in one of three forms:
  - **`D-N`** — an entry in the reading repository's own `decisions.d/`.
  - **`scaffold D-N`** — an entry in the scaffold's public log. That log is the `decisions.d/` of
    the repository that publishes `CLAUDE.md` and the skills.
  - **`private D-N`** — an entry in the private log of the repository the scaffold grew in. No
    reader outside that repository can open it.

  `CLAUDE.md`, `STYLE.md` and every skill travel to every consuming repository. Never write a bare
  `D-N` in them. A bare id there names the consumer's own entry instead. In the scaffold's own
  repository, `D-N` and `scaffold D-N` name the same log. **A marked citation is provenance
  only.** Make the sentence around it state everything the reader needs. Never make an instruction
  depend on opening the entry.
- **Format per entry** — the file opens with a level-1 heading so it is a valid standalone
  document. An assembler that joins entries into one document demotes that heading to level 2.
  Each `<…>` below is a placeholder:

  ```markdown
  # D-<N> — <YYYY-MM-DD> — <short decision title>

  - **Decision:** what was decided, in one or two sentences.
  - **Context:** why (the alternative considered, the trigger).
  - **Supersedes:** D-<S> (if applicable — and add "Superseded by D-<N>" to D-<S>; never delete entries)
  - **Corrects:** D-<C> (if applicable — and add "Corrected by D-<N>" to D-<C>; never delete entries)
  - **Affects:** areas/tickets/PRs this touches (e.g. pricing pages, ABC-45, PR #12)
  ```

- **Two relations, and the test that picks one.** Ask whether the earlier decision still binds.
  **`Supersedes`** — the earlier decision, or the named part of it, is **off**. A reader must stop
  applying it. **`Corrects`** — the earlier decision **stays in force**, and this entry changes its
  scope, its mechanism, or how it was recorded. A reader must read both entries.
  **Write `Supersedes` when you cannot tell.** It is the louder claim, and it sends the reader to
  the newer entry. A wrong `Corrected by` leaves a reader applying a rule that is off, which is the
  worse of the two failures.

- **Append-only.** Reversed decisions are superseded by a new entry, never edited away — the
  history is the point.
- **Either relation still edits the earlier entry's file, and that is left conflicting on
  purpose.** Two branches marking one decision superseded or corrected is a genuine semantic
  disagreement about what the project has decided — a human should resolve it. The
  one-file-per-decision layout removes the *mechanical* collision (two unrelated decisions fighting
  over one file); it deliberately does not remove this one.
  **Name the earlier entry's file in the issue's declared file footprint** whenever you write
  either relation. One entry, private D-70, could not write its back-reference, because that
  file sat outside its footprint.
- **Who reads it:** every agent, at two moments — before implementing a ticket (§4.4) and
  during pre-merge review (§6.2).
- **Sweep on change:** when a new decision lands, briefly scan open tickets and open PRs for
  ones it invalidates; comment on each affected item naming the decision ID.

## 8. Secrets — never print raw values

- **Never write a raw secret to a durable or published surface.** This covers the contents of
  `.env*` or any secrets file — including via Read/cat/grep — even to "verify" a fix. The
  covered surfaces are:
  - a PR body, and a PR comment;
  - a ticket body, and a ticket comment;
  - a commit message;
  - a decision-log entry;
  - a plan document;
  - chat output.

  **That list is not exhaustive.** The category governs a surface the list omits.
- **A leak on a published surface is worse than a leak in chat.** The text persists. Everyone
  with repository access can read it. An edit does not retract it.
- To check a secret: confirm existence only ("KEY is set"), show a redacted form (first 6–8
  chars + `...`), or compare programmatically (script prints `true`/`false`).
- **Treat a secret written to any covered surface as compromised.** Say so explicitly. Recommend
  rotating it at its source. On a published surface, redact the text first. Then rotate.
  **Redaction does not undo the exposure** — git history, the host's notification emails and its
  caches keep the original.
- Keep a pre-commit hook that blocks staged `.env*` files (except `.env.example`) and
  common secret patterns.

## 9. Writing style — the house guide

**There is no work log, deliberately.** The tracker is the record of what was done: a closed ticket
carries its title, its acceptance criteria, the PR that closed it, the merge commit and the whole
comment history. Recording the same facts a second time creates an obligation with no reader, and
the second copy is the one that goes stale. Comment what shipped on the ticket (§2, §4.9) and let
the merge close it (§6.5). Decisions are different, and §7 says why: a decision explains *why* a
choice was made, which no ticket state can reconstruct.

Agents execute these documents, so write them so they cannot be misread. Keep an instruction
sentence to 20 words or fewer, and an explanatory sentence to 25. Give each sentence one
instruction, in the imperative ("Run the tests", not "the tests should be run"). Use one term per
concept — never alternate `issue` and `ticket`. The style is required for instruction prose,
encouraged for descriptive prose, and exempt for decision entries, which exist to argue. Read
[`STYLE.md`](STYLE.md) before you write or edit a document; nothing enforces it (private D-29).

## 10. Spend guardrails (projects that call paid APIs)

If the project makes AI/API calls, `PROJECT.md` must define hard caps (per-operation and
monthly), alerting thresholds, and which model/tier each code path may use. Agents must
reference these caps in any discussion or implementation of API-calling code, and must never
raise a cap without a logged decision (§7).

## 11. Testing policy

Tests are part of the change, not a follow-up ticket. The concrete runner, commands, and any
per-project coverage floor live in `PROJECT.md`; this section defines *when* tests are required
and *what makes them worth having*. It is deliberately risk-based and numberless — judgment over
a blanket percentage.

**When a test is required (risk-based):**

1. **Every behavior change ships with a test that asserts the behavior.** New feature, changed
   logic, changed output — add or update a test that would fail if the behavior regressed.
2. **Every bug fix starts with a failing regression test.** Write the test that reproduces the
   bug, watch it fail, then fix until it passes. The test proves the bug existed and stays as a
   guard. Reference the ticket ID in the test name or a comment.
3. **High-stakes paths are never merged without tests.** Anything touching money/billing,
   auth/session, entitlements/access control, cost guardrails, or schema/data integrity requires
   tests covering both the success **and** the failure/denied path — no exceptions.
4. **Exempt** (state the exemption in the PR body): docs-only, formatting-only, pure config,
   comments, mechanical renames with no behavior change, and a scope that `PROJECT.md` declares
   manually verified because automated assertion is not possible in that project.
   **That declaration lives in `PROJECT.md`** — naming the scope, and why automation is not
   possible there. A PR body may not assert it for the first time. State the exemption and link
   the declaration, as this rule already requires. **This exemption never covers a rule 3 path.**
   No `PROJECT.md` declaration exempts money/billing, auth/session, entitlements/access control,
   cost guardrails or schema/data integrity — rule 3 wins. Mark the change test-unverified per
   rule 11, so the two rules agree. When in doubt, add the test.

**What makes a test worth having:**

5. **Assert behavior, not implementation.** A test that only checks a function was called, or
   re-asserts a mock's return value, proves nothing. Assert the observable outcome.
6. **Don't mock away the thing under test.** Ask of any suite: *would this still pass if the
   real integration were broken — the DB missing the columns, the API returning an error, the
   query silently failing?* If yes, the test is theater. Prefer real or realistic fixtures for
   the boundary you're actually validating; mock only what's genuinely external and expensive.
7. **Cover the failure branch (mirrors §4.8).** For any claim of "X is enforced / recorded
   / rejected," a test must exercise the path where X does *not* hold — the throw, the early
   return, the denied request. Silent-failure clients (that return errors instead of throwing)
   must have a test asserting the error is handled, not swallowed.
   The `project-audit` skill states the same rule as R1, its failure-branch rule.
8. **Coverage is judged by risk, not a global percentage.** Critical paths (per rule 3) must be
   covered; the rest is judgment. If a project wants a hard coverage floor, it is defined in
   `PROJECT.md` and enforced in CI — not asserted here.

**Gates (reinforcing §3, §4.8, §6):**

9. Run the pre-PR gate before you open the PR. `PROJECT.md` declares that gate, in its
   "Build / lint / test commands" section. Run the gate again after every sync with the default
   branch. A sync is a rebase before the branch's first push (the `issue-loop` skill's §4 step 7),
   or a merge after it (§6, pre-merge check 4). Open the PR only when the whole gate passes. Keep
   the PR green.
10. **Never disable, skip, or weaken a test to make a PR green.** A failing test is a finding:
    fix the code, or if the test is genuinely wrong, fix the test and say so in the PR. Deleting
    or `.skip`-ing a test to pass CI is prohibited. No issue's instructions override this.
    The `issue-loop` skill's §2 tells a lane not to comply, and the `pr-reviewer` skill's
    HARD RULES makes the reviewer report any pull request that does.
11. **If the suite can't run in this environment, say so explicitly** and mark the change as
    test-unverified rather than claiming it passed. Don't report green you didn't see.

---

## 12. Skills — addressed by name, never by path

**Write a skill's name, in backticks: the `pr-reviewer` skill.** Never write a path of the shape
`<skills-dir>/<name>/SKILL.md`. This holds in every document that travels — this file, and every
skill.

**A path does not survive the trip.** This file is shared by every governed repository, and a
skill is installed once per machine, outside any of them. Three install locations are legitimate:
the personal skills directory, a repository's own `.claude/skills/`, and a plugin. Which one
applies depends on the machine, and on whether the session is local or remote. So a path written
here resolves only in the repository it was written in. The name is what an agent invokes, so the
name is the only address that travels.

**Installed means invocable, not present on disk.** A skill is installed when an agent can invoke
it by name in this session. Read that from the session's own list of available skills.

**Never conclude a skill is missing because a path does not exist.** The two are unrelated. Every
rule that turns on a missing skill — §6 escalation condition 6 — then fires on every PR forever,
which looks like a correct fail-closed result and is not one.

**A namespaced entry is the skill it names.** A plugin installs each skill under a prefix, so the
session lists it as `<plugin>:<name>`. That entry is the skill `<name>`. It satisfies every citation
of `<name>`, in every document. The prefix belongs to the installer, and is not part of the skill's
identity. Keep writing the bare name in documents: the bare name stays the address. Never conclude
a skill is missing because the session lists it only with a prefix. That mistake fires §6 escalation
condition 6 on every PR, exactly as the path mistake does.

---

## 13. Escalation queue — collect the questions, then ask once

Record the question when you need an answer from the user. Then keep working. Ask at the end of
the run, in one digest. Asking per item costs the user one return trip per question, and a run
over ten items costs ten.

**Every entry records five things:**

1. The item it belongs to — the ticket or the PR, by id.
2. The one question the user has to answer.
3. What you already tried, if anything, so the user is never asked to repeat it.
4. The options, each with what that answer causes. Put the recommended one first, with its reason.
5. What stays blocked until the answer arrives, by id.

Write the entry in the shape of the ASK block the `pr-merge-loop` skill defines, and in the plain
language that skill requires. Cite that shape. Never re-specify it here.

**Two questions never wait for the digest.** Ask each one in place, the moment you reach it:

- **A contradiction the run cannot reason past** — two items that undo each other, a locked pair
  above all. Both items stay blocked until the user rules. A run that acts on either one is acting
  on a state it cannot read.
- **A destructive or irreversible action** — closing a PR or a ticket, deleting a branch, dropping
  data. Confirm the item by id with the user first, every time.

Queue every question whose answer affects one item alone. Such a question never blocks the run.
Ask a question about the run itself in place — the order the run works in, above all — because no
single item carries it.

**The queue lives in the run, and nowhere else.** Never commit it. Never write it to a tracked
file. A committed queue outlives the run that built it, and the copy left behind is the one that
goes stale. The durable record already exists: the question is a comment on the item, and the item
carries whatever input-needed signal `PROJECT.md` declares. A later agent that "improves" the queue
into a tracked file rebuilds exactly the stale state this rule removes. §9 refuses a work log for
the same reason.

**Present one digest at the end of the run.** Group the entries by what the answer unblocks. Give
each entry one decision. Never compound two questions into one entry.

**An answer maps back to its item.** Apply it to the item that entry names. Then continue that
item's flow from the point where it queued. An answer to one entry never carries to another (§6).
Re-present an entry whose item changed while the run continued, because an approval expires with
the diff it was given for (§6).

---

## Project-specific context

Everything about THIS project — product, stack, toolchain mapping, commands, milestones,
metrics, constraints — lives in **`PROJECT.md`**. This file defines how we work; that file
defines what we're working on. Keep both current: workflow changes here (via PR), project
facts there (via PR), decisions in `decisions.d/`.
