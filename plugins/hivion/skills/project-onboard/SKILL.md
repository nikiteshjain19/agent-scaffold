---
name: project-onboard
description: >-
  Adopt the workflow scaffold into a project that already exists — one with code, a
  backlog, a test suite or a CI pipeline. Interviews the owner first and records every
  answer verbatim, before reading any code. Then surveys the repository, reusing the
  `project-audit` skill for the codebase, and proves each fact with the command that
  produced it. Then reconciles the two in one table — confirmed, contradicted,
  unverifiable, unclaimed — and stops. It writes no PROJECT.md until the owner has
  answered the gaps. An unresolved field takes a stated fail-closed default, never an
  invented value. Adoption ends in observe mode: agents open pull requests and a human
  merges everything. Adopts forward and backfills nothing. Tool-agnostic: the tracker,
  repo host and CI are whatever the owner names and the survey proves. Use when the user
  says "adopt the scaffold into this repo", "onboard this project", "set up PROJECT.md for
  an existing codebase", or similar.
---

# Project Onboard (adopt the scaffold into an existing project)

You adopt the workflow into a project that is already running. The project has a product, a
backlog, tests and a pipeline. The `CLAUDE.md` §0 interview assumes none of those, so it produces a
`PROJECT.md` that describes an intention. This skill produces one that describes the repository.

Three properties define the job:

- **The owner speaks before the code does.** Run the interview first. Record every answer
  verbatim. Treat each answer as a claim to test, never as a fact.
- **The repository answers what a command can settle.** The survey asks the owner nothing. Every
  fact it reports names the command that proved it.
- **The owner reads the gaps before any document claims anything.** Present the reconciliation,
  then stop. Write nothing until the owner answers.

**The order is the design, not a preference.** A survey run first shapes the questions. The owner
then confirms what the code already does instead of stating what they want. The `project-audit`
skill carries the same rule in its "Do not restate the spec as ground truth" note: a reviewer
primed with the spec confirms it rather than discovering the truth.

**Start of run:** build a todo list from the phases below. Work it in order. Never start a phase
before the previous one is complete.

---

## THE ADOPTION RULES — they bind every phase

**Adopt forward. Never backfill.** The rules bind work from adoption onward. Existing code, commit
messages, branches and issues are grandfathered. Create no retroactive ticket. Rewrite no history.
Backfill no test. An adoption that starts by demanding a cleanup stalls, and the project keeps its
old habits.

**Never invent a value to fill a field.** An unresolved field takes its fail-closed default (see
FAIL-CLOSED DEFAULTS). Write the default into `PROJECT.md` and say it is a default. No trustworthy
green signal means **no green signal declared**, and so no auto-merge tier (`CLAUDE.md` §0). That
is the honest outcome for a project with a flaky suite. It is not a failed adoption.

**Spec the existing backlog on pickup, never in bulk.** The loop skills need acceptance criteria and
a declared footprint. A normal backlog has neither. Rewriting hundreds of issues is not adoption.
Mark the backlog not loop-eligible (see WRITE, step 5). Spec each issue when someone picks it up.

**Open pull requests predate the gate.** Let each one land under the old rules, or close it. Never
retrofit the escalation conditions of `CLAUDE.md` §6 onto a pull request opened before adoption.

**A committed secret is already compromised.** The pre-commit hook `CLAUDE.md` §8 requires stops the
next leak. It does nothing about the last one. Report every secret the survey finds. Name where it
is. Recommend rotation at the source. Never print the value (§8).

**The decision log starts now.** Record the decisions this adoption makes. Reconstruct an earlier
decision only where the owner states it. Never infer a decision from code. A log of guesses is worse
than a short log.

---

## 0. PRECONDITIONS — check two facts, and read nothing else

Read one file before the interview: the workflow's own `CLAUDE.md`, for the §0 interview topics.
That is the scaffold's rules file. Never read a file from the project being adopted. That includes
the project's own `CLAUDE.md`, if it has one. Then check two facts, without opening any other file:

1. **Does `PROJECT.md` exist?** List the repository root to find out. Never open the file yet.
   If it exists, STOP. Ask the owner whether to replace it. This skill writes a first `PROJECT.md`,
   never a silent second one.
2. **Is the project existing, by `CLAUDE.md` §0's routing test?** Run the test §0 states under
   "The test that chooses". Never restate that test here, so the two cannot drift. Read no diff.
   If the test says the project is new, run `CLAUDE.md` §0 instead, and say why. If §0 calls the
   result ambiguous, ask the owner which path to take. Never pick the new-project path by default.

---

## 1. INTERVIEW — the owner first, verbatim

Run the seven topics of `CLAUDE.md` §0, one topic at a time. Cover everything §0 lists for each
topic. Propose the default risk list in topic 7, exactly as §0 says.

**Ask each topic in the present tense.** An existing project has a state, not only a plan:

- topic 1 — what the product is today, and what ships next, instead of what v1 looks like;
- topic 4 — what is in flight now, and what must ship before what;
- topic 7 — which check the owner trusts today, and how often it is wrong.

**Ask four adoption questions after topic 7:**

1. Which pull requests and branches are open, and what should happen to each?
2. Which earlier decisions do you want recorded? Record only the ones the owner states.
3. Does the repository hold an agent instruction file already? Ask what it is for.
4. Has a secret ever been committed? Ask where, and whether it was rotated.

**Record every answer verbatim.** Quote the owner's words, not your summary. Keep the record in this
run. The reconciliation table quotes it.

**Correct nothing during the interview.** You have read no code, so you have nothing to correct
with. An answer that sounds wrong is a claim the survey tests.

**Record "I don't know" as unresolved.** Never fill it with a guess. Record "you decide" as a choice
you make later, in WRITE, and log it as `CLAUDE.md` §0 requires.

---

## 2. SURVEY — read the repository, and resolve nothing by asking

**Run the survey in a subagent that has not seen the interview record**, where the session can
dispatch one. Give it the repository and this phase, and nothing else. A surveyor that knows the
owner's answers reads to confirm them. Where no subagent can be dispatched, run the survey yourself.
Say so in the report.

**The survey is read-only.** Write to no file, branch, tracker item or host setting. Run no
migration. Touch no production system.

**Evidence rule.** Every finding names the exact command that produced it, and what that command
printed. A finding without a command is *inferred*. Label it so. This is the `project-audit` skill's
R2, the evidence rule, applied here unchanged.

### 2.1 The codebase — reuse the `project-audit` skill

Invoke the `project-audit` skill for the codebase survey. Never restate its passes here. Tell it
two things:

- `PROJECT.md` does not exist yet. Resolve its CONFIG step from the repository itself.
- Return its repository map, its Phase 0 artifacts, its architectural map and its coverage
  declaration. Those are survey evidence.

Take from its output the paths that carry risk and the integrations nobody may have named — a
payment provider, a second datastore, a cron job, a feature-flag system, telemetry.

### 2.2 The adoption facts — establish each one with a command

Establish each fact below. Record the command beside the result.

1. **The real build, lint and test commands.** Read them from the repository's own scripts: the
   package manifest, the `Makefile`, the task runner. Never take them from the README alone.
2. **Whether the test suite runs, and whether it passes.** Run it once, in a scratch worktree.
   Record the exit code and the counts. Never run it when it needs a live service or a
   credential. Record "not run", and why.
3. **What CI runs.** Read every pipeline definition. Record each job, the events that trigger it,
   and what it actually executes. Read the recent run history on the default branch. Count the
   failures, and the failures that passed on a re-run.
4. **What the host enforces today.** Read the default branch's protection or ruleset through the
   host's API. Record each rule that exists. An empty answer means nothing is enforced.
5. **The paths that carry risk.** Map them against the categories of the default risk list in
   `CLAUDE.md` §0. Cover migrations, auth, billing, entitlements, secrets, dependency manifests,
   infrastructure, CI configuration and agent configuration. Name each path you found.
6. **The tracker's real vocabulary.** List its statuses, its labels and its priority model through
   the tracker's own CLI or API. Count the open issues.
7. **Any committed secret, in the working tree or in history.** See 2.3.
8. **The open pull requests and the long-lived branches.** List every open pull request with its
   age. List every remote branch with its last commit date.

### 2.3 Secrets — find them without printing them

Search the working tree and the full history for credential-shaped content. **Print locations,
never matches.** Use a command whose output carries a path, a commit and a line number, and no
matched text:

```bash
# working tree — path and line number only
git grep -n -I -E '<pattern>' | cut -d: -f1,2
# history — commit and file names only, no patch
git log --all -G '<pattern>' --format='%h %ad' --date=short --name-only
```

**Read the history output as locations to check, not as proof.** Git lists only the files whose diff
matched the pattern. Never add `--pickaxe-all`. It lists every file a matching commit touched, so the
report would over-name files. The `-G` option matches a removed line too. A hit can be the commit that
deleted a secret. Never print the matched text to tell the two apart.

A secret scanner may replace these, but only with its redaction option on. Never open a matching
line to "confirm" it. Never write a value to any surface `CLAUDE.md` §8 lists. Treat each hit as a
committed secret until the owner says otherwise.

---

## 3. RECONCILE — report, then stop

### 3.1 The table

Emit one table. Give each interview claim one row. Give each survey finding the interview never
raised one row.

| Claim or finding | Source | Evidence | Verdict |
| --- | --- | --- | --- |

- **Source** — `interview` with the owner's words quoted, or `survey`.
- **Evidence** — the command, and what it printed. Never leave this cell empty.
- **Verdict** — exactly one of the four below.

| Verdict | Meaning |
| --- | --- |
| **Confirmed** | The repository matches the answer. |
| **Contradicted** | The repository does not match. Quote both sides. "CI runs the tests" against a workflow that only lints is the common case. |
| **Unverifiable** | Nothing in the repository can settle it. Deployment and hosting usually land here. Name the command you tried. |
| **Unclaimed** | The repository holds something the interview never raised — a payment integration, a cron job, a feature-flag system, a second database, telemetry. |

**Never resolve a Contradicted row yourself.** Siding with the code decides the owner's intent.
Siding with the owner writes a false fact. The owner decides.

### 3.2 The gaps and the decisions

After the table, print three lists:

1. **Committed secrets** — each location, and the recommendation to rotate it at the source. No
   value.
2. **Unresolved fields** — each `PROJECT.md` field nothing settled, with the fail-closed default it
   takes if the owner leaves it.
3. **Decisions the owner must make** — one question per entry, in the shape of the ASK block the
   `pr-merge-loop` skill defines (`CLAUDE.md` §13). Name each answer and what it causes. Put the
   recommended answer first.

Always include these decisions:

- each Contradicted row;
- the green signal — which check, or none;
- the observe-mode exit period (see GENERATED PROJECT.md);
- what happens to each open pull request — land under the old rules, or close;
- whether to apply the pre-adoption hold signal to the open backlog (see WRITE, step 5);
- the existing agent instruction file, if the survey found one.

### 3.3 Stop

**Present the table, the lists and the questions. Then stop.** Write no `PROJECT.md`. Write no
decision entry. Create no ticket. The value of this skill is the review the owner reads before a
document starts claiming things on their behalf.

Record each answer verbatim, as in the interview. An answer that leaves a field open keeps its
fail-closed default.

---

## 4. WRITE — only after the owner has answered

Follow `CLAUDE.md` like any other change. The adoption is itself a ticket and a pull request.

1. **Create the adoption ticket with the `issue-writer` skill** (`CLAUDE.md` §2), in the tracker the
   owner confirmed. The owner approved the adoption, so that skill's pre-approved path may apply. Its
   own conditions decide, in its "5. PRESENT THE PLAN". Put the reconciliation table in the ticket's
   body. Leave out every secret value.
2. **Branch from the default branch**, per `CLAUDE.md` §3.
3. **Write `PROJECT.md`** to the shape in GENERATED PROJECT.md. Write what the repository does today.
   Where the owner wants something the repository does not do, record a gap. Never record the wish
   as a fact.
4. **Write one decision entry per decision** this adoption made, per `CLAUDE.md` §7. Include every
   "you decide" choice. Record an earlier decision only where the owner stated it.
5. **Mark the open backlog not loop-eligible**, if the owner agreed. Declare a pre-adoption hold
   signal in `PROJECT.md`, for example a `needs-spec` label. Apply it to each open issue that
   predates adoption. Read back every result. Never assume a tracker call succeeded.
6. **Close no pull request and no issue** unless the owner confirmed that item by id (`CLAUDE.md`
   §13).
7. **Run the project's own gate**, as the survey found it. Open the pull request. Hand it to the
   owner.

**Never merge the adoption pull request.** It edits `PROJECT.md`, which every project risk-lists.

---

## GENERATED PROJECT.md — the shape

Use the section names the skills read (`CLAUDE.md` §0). A renamed section reads as a missing one.

| Section | What it carries |
| --- | --- |
| **Product** | What the product is today, who it is for, and what ships next. |
| **Toolchain** | The repo host, the CI, the hosting, the services, and the tracker mapping the `issue-loop` skill reads: how to reach the tracker, its real status names, its priority model, its id format, its dependency signal, its input-needed signal, and its hold signals — including the pre-adoption signal. |
| **Build / lint / test commands** | The commands the survey proved, and the pre-PR gate. Say which ones do not exist. |
| **Merge gate** | Green signal, risk-list paths and how they are matched, size threshold, footprint enforcement, and the enforcement mechanism — what the host enforces and what is only honoured. |
| **Parallelism** (inside Merge gate) | Max lanes, max cycles per run, and max repair rounds per pull request. |
| **Milestones / build sequence** | What is in flight, and what must ship before what. |
| **Constraints & working style** | Spend caps where the project calls a paid API (`CLAUDE.md` §10), compliance, secrets categories, and how much autonomy agents get. |
| **Adoption** | The adoption date, observe mode and its exit criteria, what is grandfathered, the open pull requests and what happens to each, the reported secret locations, and every field still at its fail-closed default. |

**Record how the risk-list patterns are matched**, for example "matched as gitignore rules
(`gitignore(5)`)". The `pr-merge-loop` skill treats escalation condition 1 as unevaluable without a
declared matcher. Condition 1 then fires on every pull request, even after the observe-mode `*`
entry comes out.

### Observe mode — how adoption ends

Adoption ends in **observe mode**. Agents open pull requests. A human merges every one.

**Put observe mode where the skills already read it.** Make `*` the first entry of the risk-list
paths, marked as the observe-mode entry. Every path then matches, so escalation condition 1 fires on
every pull request. No skill needs a new rule to honour it.

**Write the exit criteria into the Adoption section.** The `*` entry comes out only when both hold:

1. **The green signal is trustworthy over a stated period.** The owner states the period. No false
   green and no unexplained red on the default branch in that period.
2. **The risk list stopped changing over the same period.** No path added or removed.

Removing the `*` entry edits `PROJECT.md`, so it goes through a ticket, a pull request and a human.
Log it as a decision. **A project that turns the auto lane on at adoption is trusting a gate nobody
has watched work.**

### FAIL-CLOSED DEFAULTS

Write each default into `PROJECT.md`, and say it is a default. An undeclared field never grants
autonomy.

| Field | Default when unresolved | What it causes |
| --- | --- | --- |
| Green signal | none declared | No auto-merge tier (`CLAUDE.md` §0). |
| Risk-list paths | `*`, then the §0 "Always risk-listed" list, then every risky path the survey found | Every pull request escalates. |
| Size threshold | none declared | Escalation condition 5 fires on every pull request. |
| Footprint enforcement | on | A stray escalates. |
| Enforcement mechanism | honoured only | No claim the host enforces anything the survey did not read. |
| Max lanes | 1 | One issue at a time. |
| Max cycles per run | 1 | The `cycle-manager` skill runs one cycle, then stops. |
| Max repair rounds per pull request | 0 | No repairer runs. Every non-approve verdict goes to the owner. |
| Spend caps, for a project that calls a paid API | none declared | No agent implements or changes an API-calling path until a cap exists (`CLAUDE.md` §10). |
| Test command | none found | The pre-PR gate runs no tests. Each change is test-unverified (`CLAUDE.md` §11 rule 11). |
| Observe-mode exit period | not stated | Observe mode does not end. |

---

## HARD RULES

- **Never read code, docs or configuration before the interview is recorded.** One exception
  exists: the workflow's own `CLAUDE.md`, the scaffold's rules file, for the §0 topics. Never read a
  file from the project being adopted, including the project's own `CLAUDE.md`. PRECONDITIONS lists
  the two facts you may check.
- **Never pass the interview record to the surveyor.**
- **Never ask the owner a question a command can settle.**
- **Never write `PROJECT.md`, a decision entry, a ticket or a tracker signal before the owner
  answers the reconciliation.**
- **Never invent a value.** Use the stated fail-closed default.
- **Never backfill.** No retroactive ticket, no rewritten history, no backfilled test, no renamed
  branch.
- **Never spec the backlog in bulk.** Spec an issue when someone picks it up.
- **Never apply the escalation conditions to a pull request opened before adoption.** This rule
  binds the adoption itself. A later `pr-merge-loop` run still classifies those pull requests. In
  observe mode, each one goes to a human.
- **Never print a secret**, and never rewrite history to remove one. Recommend rotation at the
  source.
- **Never infer a decision from code.**
- **Never enable the auto lane at adoption.**
- **Never overwrite an existing agent instruction file.** The owner decides how the workflow file
  joins it.
- **Never change a host setting.** Recommend a protection rule. The owner applies it.
- **Never merge the adoption pull request.**

## QUALITY BAR — reject your own report

Reject the reconciliation before you present it if:

- any interview answer is paraphrased instead of quoted;
- any row has an empty Evidence cell, or evidence with no command;
- any Contradicted row quotes only one side;
- a survey finding the interview never raised is missing from the table;
- any field in GENERATED PROJECT.md is filled with a value nothing proved and nobody chose;
- any output contains a secret value;
- the report asks the owner something a command could have settled;
- the observe-mode exit criteria are missing, or the auto lane is on.
