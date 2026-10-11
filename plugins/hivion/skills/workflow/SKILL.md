---
name: workflow
description: >-
  The workflow rules every hivion skill cites: tickets, branches, the two-tier merge gate, the
  testing policy, the decision log, secrets, the escalation queue, the house style, and the
  interview that sets up a new project. Load it before you file a ticket, cut a branch, open,
  review or merge a pull request, or write a decision entry, and whenever a skill cites
  "the `workflow` skill".
---

# Workflow — the rules every hivion skill cites

Every section below lives in the file this index names. Read that file before you apply its
section.

| Section | Sub-headings | File |
| --- | --- | --- |
| "Project bootstrap" | — | `${CLAUDE_SKILL_DIR}/references/bootstrap.md` |
| "Golden rules" | — | `SKILL.md` (this file) |
| "Tickets" | — | `SKILL.md` (this file) |
| "Branches and commits" | — | `SKILL.md` (this file) |
| "Picking up a ticket" | "Justify every line you write" | `${CLAUDE_SKILL_DIR}/references/implementation.md` |
| "Dependencies and build order" | — | `SKILL.md` (this file) |
| "Merge gate" | "Opening a pull request", "Pre-merge checks", "Review record", "Escalation conditions", "Approval gate", "Repair", "Dependent sweep", "Auto-merge tier", "Enforcement" | `${CLAUDE_SKILL_DIR}/references/merge-gate.md` |
| "Decision log" | — | `${CLAUDE_SKILL_DIR}/references/decision-log.md` |
| "Secrets" | — | `SKILL.md` (this file) |
| "Writing style" | — | `SKILL.md` (this file), pointing at `${CLAUDE_SKILL_DIR}/references/style.md` |
| "Spend guardrails" | — | `SKILL.md` (this file) |
| "Testing policy" | — | `${CLAUDE_SKILL_DIR}/references/testing.md` |
| "Skill addressing" | — | `SKILL.md` (this file) |
| "Escalation queue" | — | `${CLAUDE_SKILL_DIR}/references/escalation-queue.md` |

Workflow rules for Claude (and any coding agent) working in this repository. These rules are
tool-agnostic: the concrete tools (ticket tracker, repo host, CI, etc.) for THIS project are
defined in `PROJECT.md` at the repo root. If `PROJECT.md` does not exist yet, run
"Project bootstrap" before doing anything else. A missing `PROJECT.md` does not
make the project new: "Project bootstrap" decides that first.

Everything about THIS project — product, stack, toolchain mapping, commands, milestones,
metrics, constraints — lives in **`PROJECT.md`**. This skill defines how we work; that file
defines what we're working on. Keep both current: workflow changes here (via PR), project
facts there (via PR), decisions in `decisions.d/`.

## Golden rules

1. **No ticket, no code.** Every change starts with a ticket in the tracker.
2. **No direct pushes to the default branch.** Every change goes through a feature branch
   and a pull request — no matter how small.
3. **Agents merge only through the two-tier gate in "Merge gate".** An escalated PR merges only
   after the user explicitly approves *that specific PR*. A PR that trips no escalation condition
   may merge without asking, once an independent reviewer approves it. No agent ever merges a PR it
   authored.
4. **Read the decision log before implementing and again before requesting merge** (`decisions.d/`,
   "Decision log"). A decision made after a ticket or PR was written can invalidate it.
5. **Never build an artifact ahead of its consumer.** No table, column, endpoint, or
   entitlement that nothing in the current codebase (or same-milestone work) uses.
6. **Never print secrets.** Not even to "verify" them.
7. **When in doubt, ask.** A question is cheap; unwinding wrong work is not.

## Tickets

- **Every piece of work has a ticket** — features, bugs, refactors, docs, config. Create the
  ticket before you start work. Create every ticket with the `issue-writer` skill. The ticket that
  writes `PROJECT.md` uses that skill's bootstrap exception. Never write a ticket by hand. The loop
  skills read only the headings that skill writes. When this session cannot invoke the skill
  ("Skill addressing"), stop and ask the user. Never fall back to a hand-written ticket.
- **Mark the ticket "In Progress" the moment work starts** — before the first commit, not
  after. Don't batch status updates to the end.
- **Mark it "Done" only when the PR is merged** (or, for non-code tickets, when the deliverable
  is confirmed complete). Wherever the tracker supports it, link the PR to the ticket (e.g.
  "Closes TICKET-ID" magic words) so the merge itself closes the ticket. Never mark Done while
  the PR is still open.
- **Comment material findings on the ticket** — blockers found, scope corrections, decisions
  needed. The ticket is the record of the work, not the chat transcript.
- **When creating tickets, set dependencies up front** (see "Dependencies and build order").

## Branches and commits

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

## Dependencies and build order

These rules exist because out-of-order work creates "orphan" artifacts — infrastructure with
no consumer — that later work has to detect and remove. That is pure waste, twice.

1. **Check blockers before starting** ("Picking up a ticket", step 2).
2. **Respect milestone order.** Tickets are grouped under build-sequence milestones. If a
   ticket has no milestone and its ordering is unclear, ask before starting.
3. **Never build an artifact ahead of its consumer.** Before creating a DB table/column,
   endpoint, entitlement, or config surface, confirm something in the *current* codebase will
   read or write it — or that the consuming feature ships in the same cycle under the same
   milestone. If nothing consumes it yet, stop: flag the missing consumer on the ticket and
   confirm scope before proceeding.
4. **Link dependencies at ticket-creation time.** If one story produces infrastructure another
   consumes, link them blocks/blocked-by and put both in the same (or correctly ordered) milestone.
   No free-floating infra tickets. File the ticket with the `issue-writer` skill ("Tickets"). Its
   Dependencies section records the links.
5. **When in doubt about order or consumers, ask before making schema changes.** Wrong-order
   schema changes are expensive to unwind.
6. **Name every document your change makes false.** Changes to the commands, the CI jobs, the file
   layout, the directory contents, or the toolchain trigger this rule. Check `PROJECT.md`,
   `README.md`, `CLAUDE.md`, `STYLE.md`, every skill, and the decision log. Declare each falsified
   document in the issue's footprint, naming the section. Fix it in the same PR as the change,
   never in a follow-up ticket. Declaring it is what makes the repair in-scope: a PR that repairs a
   document its issue declared is not straying (`PROJECT.md`, "Merge gate").

## Secrets

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

## Writing style

**There is no work log, deliberately.** The tracker is the record of what was done: a closed ticket
carries its title, its acceptance criteria, the PR that closed it, the merge commit and the whole
comment history. Recording the same facts a second time creates an obligation with no reader, and
the second copy is the one that goes stale. Comment what shipped on the ticket ("Tickets";
"Picking up a ticket", step 9) and let the merge close it ("Merge gate", "Approval gate", rule 5).
Decisions are different, and "Decision log" says why: a decision explains *why* a choice was made,
which no ticket state can reconstruct.

Agents execute these documents, so write them so they cannot be misread. Keep an instruction
sentence to 20 words or fewer, and an explanatory sentence to 25. Give each sentence one
instruction, in the imperative ("Run the tests", not "the tests should be run"). Use one term per
concept — never alternate `issue` and `ticket`. The style is required for instruction prose,
encouraged for descriptive prose, and exempt for decision entries, which exist to argue. Read
`${CLAUDE_SKILL_DIR}/references/style.md` before you write or edit a document; nothing enforces it
(private D-29).

## Spend guardrails

If the project makes AI/API calls, `PROJECT.md` must define hard caps (per-operation and
monthly), alerting thresholds, and which model/tier each code path may use. Agents must
reference these caps in any discussion or implementation of API-calling code, and must never
raise a cap without a logged decision ("Decision log").

## Skill addressing

**Write a skill's name, in backticks: the `pr-reviewer` skill.** Never write a path of the shape
`<skills-dir>/<name>/SKILL.md`. This holds in every document that travels — this skill, and every
other skill.

**A path does not survive the trip.** This skill is shared by every governed repository, and a
skill is installed once per machine, outside any of them. Three install locations are legitimate:
the personal skills directory, a repository's own `.claude/skills/`, and a plugin. Which one
applies depends on the machine, and on whether the session is local or remote. So a path written
here resolves only in the repository it was written in. The name is what an agent invokes, so the
name is the only address that travels.

**Installed means invocable, not present on disk.** A skill is installed when an agent can invoke
it by name in this session. Read that from the session's own list of available skills.

**Never conclude a skill is missing because a path does not exist.** The two are unrelated. Every
rule that turns on a missing skill — "Merge gate", escalation condition 6 — then fires on every PR
forever, which looks like a correct fail-closed result and is not one.

**A namespaced entry is the skill it names.** A plugin installs each skill under a prefix, so the
session lists it as `<plugin>:<name>`. That entry is the skill `<name>`. It satisfies every citation
of `<name>`, in every document. The prefix belongs to the installer, and is not part of the skill's
identity. Keep writing the bare name in documents: the bare name stays the address. Never conclude
a skill is missing because the session lists it only with a prefix. That mistake fires "Merge gate",
escalation condition 6 on every PR, exactly as the path mistake does.
