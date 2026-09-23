# PROJECT.md — agent-scaffold

The project document for **this** repository. `CLAUDE.md` defines *how* we work; this file defines
*what* we work on and the concrete tools the workflow resolves against. Agents read it cold.

> Scope note: this file describes this repo as its own project. A repository that installs the
> `base` plugin writes its own `PROJECT.md` through the `CLAUDE.md` §0 interview.

## 1. Product

- **Name:** agent-scaffold
- **Purpose:** publish the workflow contract (`CLAUDE.md`) and the seven agent skills, as one
  installable Claude Code plugin named `base`.
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
| **Who merges** | A human, for now. This repo declares no green signal, so no PR reaches the auto-merge tier (`CLAUDE.md` §0). An agent may run a merge only after the user approves that specific PR, and never its own. |
| **CI** | None yet. See "Build / lint / test commands". |
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
- **Lint:** none yet.
- **Test:** none yet.

**This repo has no pre-PR gate, and that has a consequence stated plainly:** with no green signal,
`CLAUDE.md` §0 gives this project **no auto-merge tier**. Every PR waits for a human, whatever it
touches.

Markdown lint and a link check are the obvious first additions. Add the commands here in the same PR
that adds the check, and log the toolchain addition in `decisions.d/`.

Per `CLAUDE.md` §11 rule 4, a docs-only change needs no new test. State the exemption in the PR body.

## 4. Merge gate

### Green signal

**None declared.** No check reports on a PR here yet. Absence of checks is **red**, never "nothing
to fail", so nothing merges unattended.

### Risk-list paths — always human, regardless of a green signal

Matched as gitignore rules (`gitignore(5)`): a pattern with no slash matches at any depth, and a
pattern with a slash is anchored to the repository root.

```text
CLAUDE.md
STYLE.md
PROJECT.md
README.md
decisions.d/**
.claude/**
.claude-plugin/**
.github/**
LICENSE
```

That covers nearly every file here, and that is correct: this project's product is its governance,
so almost every change is a governance change. A consuming application repo will declare a far
narrower list.

### Size threshold

A PR escalates when its diff exceeds **50 changed lines** or **3 changed files**. Read both from the
host: `gh pr view <n> --json additions,deletions,changedFiles`. The threshold bounds the auto-merge
tier only, and nothing reaches that tier while no green signal exists.

### Parallelism

- **Max lanes:** 3 concurrent issues.
- Two issues may share a lane group only if their declared file footprints do not intersect.
- **Max cycles per run:** 3.
- **Max repair rounds per pull request:** 3.

### Footprint enforcement

**On.** A PR whose changed files stray outside its issue's declared footprint escalates to a human.

### Enforcement mechanism — read this before trusting the gate

**The gate is honoured by the merging agent, not by the server.** This repository is public, so
GitHub rulesets and required status checks are available on the Free plan, but none is configured
yet. Until one is, nothing server-side stops a red or unreviewed PR being merged. Configuring a
ruleset is worth doing once a check exists to require.

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
