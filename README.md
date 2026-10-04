# agent-scaffold

A workflow for coding agents, and the skills that run it. Every change starts as a ticket, goes
through a branch and a pull request, and merges only behind a gate the project declares for itself.

It is tool-agnostic. The tracker, the repo host, the CI, the merge gate and the commands all come
from a `PROJECT.md` that each project writes for itself — nothing here hard-codes GitHub, Linear or
any other tool.

## What's here

- **[`CLAUDE.md`](CLAUDE.md)** — the workflow contract: ticket rules, branch and PR discipline,
  the two-tier merge gate, the testing policy, secret handling, and the interview that sets a new
  project up.
- **[`STYLE.md`](STYLE.md)** — how to write a document an agent executes rather than interprets.
- **`skills/`** — seven skills, in the order they run:
  - `feature-plan` — turn a feature request into an approved design before any issue is filed.
  - `issue-writer` — turn an idea, or an approved plan, into executable tracker issues.
  - `issue-loop` — work the backlog unattended, one lane per issue, one PR per lane.
  - `pr-reviewer` — review one pull request as an independent reviewer, and return a verdict.
  - `pr-merge-loop` — clear the open pull requests in two lanes, and merge what is ready.
  - `cycle-manager` — run the backlog cycle after cycle, composing the three skills above.
  - `project-audit` — a multi-pass architecture and code-quality review of a codebase.

## Install the plugin

Register the marketplace, then install the plugin. Run both in Claude Code:

```text
/plugin marketplace add nikiteshjain19/agent-scaffold
/plugin install hivion@hivion
```

The repository is `nikiteshjain19/agent-scaffold`; the marketplace and the plugin are both named
`hivion`, which is why the install id reads `hivion@hivion`. The skills then appear as
`hivion:issue-loop`, `hivion:pr-reviewer`, and so on.

The shell form, for a script:

```bash
claude plugin marketplace add nikiteshjain19/agent-scaffold
claude plugin install hivion@hivion
```

### Turn it on for a repository

To enable the plugin for everyone working in one repository, register it at project scope and
commit the result:

```bash
claude plugin marketplace add nikiteshjain19/agent-scaffold --scope project
claude plugin install hivion@hivion --scope project
```

That writes `.claude/settings.json`. **Committing it turns the plugin on for your collaborators
but does not download it to their machines**, so each of them runs the install command once.

### Pin a version

A marketplace can be pinned to a tag, so a repository tracks a release rather than the latest
commit:

```text
/plugin marketplace add nikiteshjain19/agent-scaffold#v0.1.0
```

Auto-update is off by default for a marketplace like this one. You receive a change when the
plugin's `version` is bumped, and not before.

### Cloud sessions do not install this plugin

**A cloud session starts from a fresh clone, and installs no plugin a repository declares.** The
Claude Code documentation states it directly: a cloud session does not install the plugins a
repository turns on under `enabledPlugins`, including ones from the marketplaces it lists under
`extraKnownMarketplaces`. So the snippet above reaches local sessions only.

A cloud session loads what the clone carries — the repository's own `CLAUDE.md`, `.claude/rules/`,
`.claude/skills/` and `.claude/settings.json` hooks — plus the skills you enable on claude.ai. To
reach one, give it the skills by one of those routes instead.

## Use the workflow

The plugin carries the skills. It does not carry `CLAUDE.md`, because a plugin cannot install one.
Give your repository the workflow in whichever way suits it:

- copy [`CLAUDE.md`](CLAUDE.md) into the repository. A cloud session reads the repository's own
  `CLAUDE.md`, so this is the route that works everywhere;
- or import it from a local clone with `@path/to/CLAUDE.md` in your own `CLAUDE.md`. A
  home-directory path resolves in local sessions only, so a cloud session sees nothing.

Then tell your agent **"start new project"**. It runs the interview in `CLAUDE.md` §0 and writes the
`PROJECT.md` every skill reads.

## What a project owes the workflow

`CLAUDE.md` expects two things this repository cannot supply for you:

- **`PROJECT.md`** — the toolchain mapping, the merge gate, and the commands. The §0 interview
  writes it.
- **A secret guard** — a pre-commit hook that blocks a staged `.env*` file and a credential-shaped
  line, as §8 requires. Write one, or take one from your host.

## Licence

MIT. See [LICENSE](LICENSE).

#Seeded violation
