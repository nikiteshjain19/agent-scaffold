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
- **`.claude/skills/`** — seven skills, in the order they run:
  - `feature-plan` — turn a feature request into an approved design before any issue is filed.
  - `issue-writer` — turn an idea, or an approved plan, into executable tracker issues.
  - `issue-loop` — work the backlog unattended, one lane per issue, one PR per lane.
  - `pr-reviewer` — review one pull request as an independent reviewer, and return a verdict.
  - `pr-merge-loop` — clear the open pull requests in two lanes, and merge what is ready.
  - `cycle-manager` — run the backlog cycle after cycle, composing the three skills above.
  - `project-audit` — a multi-pass architecture and code-quality review of a codebase.

## Install the plugin

Add this to the `.claude/settings.json` of any repository that should use the skills:

```json
{
  "extraKnownMarketplaces": {
    "agent-scaffold": {
      "source": { "source": "github", "repo": "nikiteshjain19/agent-scaffold" }
    }
  },
  "enabledPlugins": { "base@agent-scaffold": true }
}
```

The skills then appear as `base:issue-loop`, `base:pr-reviewer`, and so on. Commit that file, and
every session on that repository gets them — including cloud sessions, which install a repo's
declared plugins at session start.

## Use the workflow

The plugin carries the skills. It does not carry `CLAUDE.md`, because a plugin cannot install one.
Give your repository the workflow in whichever way suits it:

- copy [`CLAUDE.md`](CLAUDE.md) into the repository, or
- import it from a local clone with `@path/to/CLAUDE.md` in your own `CLAUDE.md`. A home-directory
  path resolves in local sessions only, so a cloud session sees nothing.

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
