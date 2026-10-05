# PROJECT.md — agent-scaffold

The project document for **this** repository. `CLAUDE.md` defines *how* we work; this file defines
*what* we work on and the concrete tools the workflow resolves against. Agents read it cold.

> Scope note: this file describes this repo as its own project. A repository that installs the
> `hivion` plugin writes its own `PROJECT.md` through `CLAUDE.md` §0: the interview for a new
> project, or the `project-onboard` skill for an existing one.

## 1. Product

- **Name:** agent-scaffold
- **Purpose:** publish the workflow contract (`CLAUDE.md`) for a repository to copy, and the eight
  agent skills as one installable Claude Code plugin named `hivion`.
- **Who it's for:** anyone who wants a disciplined ticket → branch → PR → review workflow that
  agents can run unattended.
- **What "done" looks like:** the workflow, the skills and the docs agree with each other, and a
  repository that enables the plugin can work its backlog without further setup.
- **The product is the scaffold itself.** Work here edits documents and skills, not an application.

**Scope test, for any proposed change:** does it change something every consuming repository gets?
Local convenience tooling belongs in a private repository, not here.

## 2. Toolchain

| Concern | This project |
| --- | --- |
| **Repo host** | GitHub — `github.com/nikiteshjain19/agent-scaffold` (public) |
| **Host CLI** | `gh`. Wherever a skill shows `gh …`, that is literal here. |
| **Issue tracker** | GitHub Issues, same repo. "Ticket" = GitHub issue. |
| **Base / default branch** | `main` |
| **Branch naming** | `type/issue-id-short-desc`, e.g. `feat/12-plugin-hook` |
| **Merge strategy** | Squash and delete the branch — `gh pr merge <n> --squash --delete-branch` |
| **Who merges** | The two-tier gate in `CLAUDE.md` §6 decides, from the "Merge gate" section below. |
| **CI** | GitHub Actions — `.github/workflows/lint.yml`, one job named `Markdown lint`. See "Build / lint / test commands". |
| **Database / payments / LLM APIs** | None. `CLAUDE.md` §10 does not apply, and the database steps in the skills are reported not applicable. |

### Tracker mapping (what the loop skills read)

- **Reach the tracker via:** `gh issue …` / `gh pr …`.
- **Status model:** GitHub Issues carry no status field here. The lifecycle is open → closed, and
  "in progress" is signalled by **assignment** plus a comment when work starts.
  - `Backlog` / `Todo` → open and unassigned
  - `In Progress` / `In Review` → open and assigned (a PR open means In Review)
  - `Done` → closed
- **Target state after merge:** closed, through `Closes #N` in the PR body.
- **Priority model:** labels — `priority:high`, `priority:med`, `priority:low`. Exactly one per open
  issue. An absent label means `priority:med`, never "no priority".
- **Dependency signal:** the `blocked` label. It means at least one blocker is still open. The merge
  flow clears it in its post-merge sweep.
- **Input-needed signal:** the `needs-input` label. It means a human owes this issue an answer. Only
  a human clears it.
- **Hold signals:** `blocked` and `needs-input`, and nothing else.
- **Issue-id format:** `#N`. GitHub auto-links it, and `Closes #N` closes it.
- **Merge-comment policy:** on merge, comment the PR URL and the squash SHA on the issue.

## 3. Build / lint / test commands

- **Build:** none.
- **Lint:** `npm run lint` — runs `markdownlint-cli2` over every `*.md` file, configured by
  `.markdownlint-cli2.yaml`.
- **Test:** none.

**Pre-PR gate:** `npm ci && npm run lint`. Run it before you open a PR. Run it again after you
rebase onto the default branch or merge it in (`CLAUDE.md` §11 rule 9). Open the PR only when it
passes.

`markdownlint-cli2` is the only dependency. It is a dev dependency, pinned to an exact version, and
`package-lock.json` is committed, so `npm ci` installs the same tree everywhere. Node 22 or later is
required.

A link check is not part of the gate. Add one in its own issue if the README grows.

Per `CLAUDE.md` §11 rule 4, a docs-only change needs no new test. State the exemption in the PR body.

## 4. Merge gate

### Green signal

**The `Markdown lint` job**, from `.github/workflows/lint.yml`. It runs on every pull request to
`main` and on every push to `main`. It runs `npm ci`, then `npm run lint`. Green means that job
reported success on the PR's head commit. Read it with `gh pr checks <n>`.

**What a green run proves:** every Markdown file in the repository passes the rules in
`.markdownlint-cli2.yaml`, and the pinned toolchain installs cleanly.

**What a green run does not prove:** that a document is correct, that two documents agree, that a
link resolves, or that a skill behaves as its text says. It checks form, never meaning.

Absence of the check is **red**, never "nothing to fail".

### Risk-list paths — always human, regardless of a green signal

Matched as gitignore rules (`gitignore(5)`): a pattern with no slash matches at any depth, and a
pattern with a slash is anchored to the repository root.

```text
CLAUDE.md
STYLE.md
PROJECT.md
README.md
decisions.d/**
plugins/**
.claude/**
.claude-plugin/**
.github/**
LICENSE
package.json
package-lock.json
```

The list is broad on purpose. This project's product is its own governance, so a change here
changes the rules agents follow.

`package.json` and `package-lock.json` are listed because a dependency change is exactly what
escalation condition 1 exists for.

### Size threshold

A PR escalates when its diff exceeds **50 changed lines** or **3 changed files**. Read both from the
host: `gh pr view <n> --json additions,deletions,changedFiles`. The threshold bounds the auto-merge
tier only.

### Parallelism

- **Max lanes:** 5 concurrent issues.
- Two issues may share a lane group only if their declared file footprints do not intersect.
- **Max cycles per run:** 5.
- **Max repair rounds per pull request:** 3.

### Footprint enforcement

**On.** A PR whose changed files stray outside its issue's declared footprint escalates to a human.

### Enforcement mechanism — read this before trusting the gate

**The gate is half enforced by the server and half honoured by the merging agent.** Read both
halves. A reader who believes the whole gate is enforced will trust an auto-merge that nothing
checked.

**Status: the ruleset `main — merge gate` is active on `main`.** The owner applied it on
2026-10-04. An agent never creates or edits it (D-13). Confirm it is live before you rely on it:
`gh api repos/nikiteshjain19/agent-scaffold/rules/branches/main`. A live ruleset returns four rule
types: `pull_request`, `required_status_checks`, `non_fast_forward` and `deletion`. An empty list
means it is not applied.

**Enforced by the server** — a GitHub ruleset on the default branch (`main`), with no bypass actors:

- No direct push. Every change reaches `main` through a pull request.
- No force-push.
- No deletion of `main`.
- No merge unless the `Markdown lint` check reported success on the PR's head commit. The check is
  pinned to GitHub Actions, so a commit status with the same name does not satisfy it. A missing
  check blocks the merge, exactly as escalation condition 2 reads it.

**Not enforced: an approving review.** GitHub refuses a self-approval, so on a one-person repository
that rule makes every PR unmergeable without an admin override (D-13). The independent reviewer here
is the `pr-reviewer` skill, under escalation condition 6.

**Still only honoured** — the server knows nothing about these. The merging agent reads and obeys
each one itself:

- the risk-list paths (escalation condition 1);
- the footprint rule (condition 3);
- a deleted, skipped or weakened test (condition 4);
- the size threshold (condition 5);
- the reviewer's verdict (condition 6);
- a stale ticket, PR body or decision (condition 7);
- an effect a revert cannot undo (condition 8);
- the rule that an agent never merges its own PR;
- the per-PR approval the escalation tier requires.

A green, mergeable PR on GitHub therefore proves only the enforced half. It never means the PR may
auto-merge.

## 5. Milestones / build sequence

No fixed plan. Work is incremental improvement of the scaffold, one issue at a time. Ordering rule:
a change to `CLAUDE.md` lands before, or together with, any skill that depends on the rule it adds.

## 6. Constraints & working style

- **No paid-API spend.** Nothing here calls a metered API.
- **Secrets:** none expected. A contributor still needs a local secret guard per `CLAUDE.md` §8.
- **Public repository.** Every file, issue and PR comment here is world-readable. Never write a
  private project's name, a client's name, a local path or an internal URL into this repo.
- **Working style:** async-first. An agent may implement and open PRs, but never merges its own.
- **Keep the scaffold generic:** project-specific facts live here, never in `CLAUDE.md` or a skill.

---

*Maintain this file through the normal ticket + PR flow. Workflow rules go in `CLAUDE.md`; project
facts go here; decisions go in `decisions.d/`.*
