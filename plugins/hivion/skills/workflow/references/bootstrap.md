# Project bootstrap

Run this section when `PROJECT.md` is missing, or the user says "start new project".

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
3. **Branching** — default branch name, branch naming convention, who merges (default: the two tiers
   of "Merge gate" — an escalated PR merges only after explicit per-PR human approval, a PR that
   trips no escalation condition may merge after an independent approve, and no agent merges its own
   PR).
4. **Build sequence** — milestones / week-by-week order, and any hard "ship X before Y" rules.
5. **Constraints** — budget caps (especially AI/API spend), compliance needs, secrets
   categories, non-negotiables.
6. **Working style** — async-first preferences, how much autonomy agents get, when to ask
   vs. decide.
7. **Merge gate** — what makes a change safe to merge without a human reading it. Capture: the exact
   command or check that produces a trustworthy **green signal**; which paths are **high-risk** and
   always need a human regardless (start from the default risk list below); whether the repo host
   **enforces** checks server-side (required status checks / branch protection) or whether the gate
   is only honoured by whoever merges; how many issues may be worked **in parallel**. Never ask
   whether a stray escalates: footprint checking is always on ("Merge gate", escalation condition
   3). Record it as a Merge gate section in `PROJECT.md` — the review/merge flow reads exactly this
   to decide what it may merge unattended.

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
`Corrects` back-reference ("Decision log"). Such an edit switches off or rescopes a rule agents
follow today. A deleted entry always escalates too, because the log is append-only ("Decision log").

**Write the change types beside the glob.** A glob alone matches an added entry too. Record the
line in the Merge gate section as `decisions.d/**`, modified or deleted only. Escalation condition 1
applies that qualifier ("Merge gate").

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
verdict, a diff inside the footprint or inside a widening the independent reviewer approved, and a
diff inside the size threshold. Nothing about a docs change is special, and nothing about it is
exempt.

**Classify by path, never by what the PR calls itself.** A diff described as a doc fix that edits a
risk-listed file is a risk-listed change. Escalation condition 1 reads the diff ("Merge gate").

**Ask which documentation is load-bearing.** Some documentation changes behaviour: a runbook, an API
contract, a published policy, a prompt an agent executes, or an `.env.example`. Ask the project
whether any of its documentation falls in that class. Risk-list each such path by name.

Then generate, commit (via a ticket + PR like any other change), and keep maintained:

- **`PROJECT.md`** — the project document: everything from the interview, structured so an agent can
  read it cold and know the product, stack, toolchain mapping (which tracker, which repo, which
  commands), milestones, metrics, and constraints. **Cite a `PROJECT.md` section by its name, never
  by its number** — every project generates its own and renumbers it, so a number in a skill or a
  doc rots. Cite the `workflow` skill by its section names too, which this scaffold fixes, and never
  by a section number (private D-37; scaffold D-87). **Use the section names the skills read.** Name
  them "Toolchain", "Build / lint / test commands" and "Merge gate", with a "Parallelism" section
  inside "Merge gate". Skills find these sections by name, so a renamed section reads as a missing
  one. File the ticket that writes this file under the `issue-writer` skill's bootstrap exception.
- **`decisions.d/`** — the decision log, one file per decision, seeded from any decisions made
  during the interview (see "Decision log" for format). Read it by reading the directory.
- Initial milestones and tickets in the tracker, with dependencies linked
  ("Dependencies and build order"). File each ticket with the `issue-writer` skill ("Tickets").

**Hard rule — no green signal, no auto-merge tier.** A project whose Merge gate section declares
no green signal has **no** automated merge path: every PR stays human-gated until a real check
exists. A merging agent must treat *no checks reported* as red, never as "nothing to fail" —
absent evidence is not evidence of safety. Autonomy is earned by building the check, and a
project cannot grant itself autonomy it has not earned.

If the user's answer to any interview topic is "you decide", record the choice you made as a
decision in `decisions.d/` so it is visible and reversible.
