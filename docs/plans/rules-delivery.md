# How the skills and their rules reach every session — plan

Version: v1

This plan covers issues #17 and #18 together, as the work order on #17 asks. #17 decides how the
rules reach a cloud session. #18 decides where the rules live inside the plugin.

## Context

### The request

- **#18.** The skills cite a `CLAUDE.md` that the plugin cannot install. Make the plugin the
  authority for its own rules, so that no skill needs a file outside the plugin.
- **#17.** A cloud session installs no plugin. Name a route for each surface: local, cloud,
  routine and Cowork. Build each route, and prove it in a real session.
- **Who it serves:** every repository that uses the `hivion` skills, and every agent that runs
  them, on any surface.
- **Done means:**
  - A repository with no `CLAUDE.md` runs every skill, and no skill cites a rule it cannot reach.
  - Each surface has a named route, proved in a real session on that surface.
  - The rules that must hold unprompted reach every session, through a file the plugin or the
    vendored copy carries.

### The system today

Read at `237bf160e7feafbef310874941908f03e770fb1e`, the tip of `main`.

- The plugin root is `plugins/hivion/`. It holds the manifest and eight skills, and nothing else
  (D-48).
- The rules live in `CLAUDE.md` (851 lines, 55,543 characters) and `STYLE.md` (8,520 characters),
  at the repository root. Neither file is in the plugin.
- The skills and their reference files cite `CLAUDE.md` by number 182 times in the explicit form
  `` `CLAUDE.md` §N ``. Bare `§N` citations add more, and a bare `§N` can also name the skill's own
  section. `§6` is the most cited section.
- `CLAUDE.md` §0 fixes the number convention: "keep citing it as `§N` (private D-37)".
- `README.md`, "Use the workflow", tells a consumer to copy `CLAUDE.md` or to import it.
- The plugin ships no hook. The repository has no `.claude/` directory.
- The pre-PR gate is `npm ci && npm run lint`. The project has no test command (`PROJECT.md`,
  "Build / lint / test commands").
- The lane budget is 5 (`PROJECT.md`, "Merge gate" → "Parallelism"). Every story below touches a
  risk-listed path (`plugins/**`, `CLAUDE.md`, `PROJECT.md`, `README.md`, `package.json` or
  `.github/**`), so every pull request in this plan waits for the owner.

### What the platform does

Read in the Claude Code documentation on 2026-10-07. The design depends on each row.

| Fact | Source |
| --- | --- |
| A cloud session loads the clone's `CLAUDE.md`, `.claude/rules/` and `.claude/skills/`. It installs no plugin that the repository declares. | code.claude.com/docs/en/cloud-environments, "What carries over from your setup" |
| A cloud session runs repository hooks only in a session with one repository. | the same table |
| A routine runs as a full cloud session, and uses the skills committed to the cloned repository. | code.claude.com/docs/en/routines |
| Cowork adds a marketplace from a GitHub `owner/repo`. It loads a plugin's skills and `hooks/hooks.json`. It refuses a plugin with a top-level `bin/`. | claude.com/docs/cowork/guide/plugins; claude.com/docs/plugins/platform-support |
| A rule file in `.claude/rules/` with no `paths` frontmatter loads at launch. | code.claude.com/docs/en/memory |
| A plugin ships hooks in `hooks/hooks.json`. `${CLAUDE_PLUGIN_ROOT}` is the plugin's installed path. | code.claude.com/docs/en/hooks; code.claude.com/docs/en/plugins/manifest-reference |
| A `SessionStart` hook's stdout becomes context, capped at 10,000 characters. No setting raises the cap. The sources are `startup`, `resume`, `clear`, `compact` and `fork`. | code.claude.com/docs/en/hooks |
| A skill links its supporting files by relative path. A plugin cannot declare a component outside its own directory. | code.claude.com/docs/en/skills; code.claude.com/docs/en/plugins/loading |
| A plugin skill and a project skill with the same name both load. The plugin skill is namespaced. | code.claude.com/docs/en/skills |
| "To include instructions in a plugin, write them as a skill." "If a rule must hold every time … add it to the plugin as a hook rather than a skill." | code.claude.com/docs/en/plugins/components |

**Silent in the documentation, and the design does not depend on them:** whether a file a hook
writes to `.claude/rules/` loads in the same session; whether repository or plugin hooks run in a
routine; whether a cloud session with several repositories loads each clone's `.claude/skills/`.

## Design

### The approach

Move the rules into a new skill, the `workflow` skill (proposed), inside the plugin. Every other
skill cites it by name and by section name, never by number. A short fixed text of must-hold rules,
the invariants, reaches each session before any skill loads. Where the plugin is installed, a plugin
`SessionStart` hook prints it. Where the plugin is not installed, a committed
`.claude/rules/hivion.md` carries it. For cloud sessions and routines, a consuming repository
commits a vendored copy of the skills and the invariants. A script writes the copy, with a manifest
that records the source version and a drift check that proves the copy is unedited. One file,
`plugins/hivion/hooks/invariants.md`, feeds both the hook and the vendored rule file. So the hook
that #17 and #18 both need is designed once.

### The route for each surface

| Surface | The skills reach it through | The invariants reach it through |
| --- | --- | --- |
| Local session: terminal, desktop or IDE | the plugin `hivion@hivion`, or the vendored copy | the plugin hook, or `.claude/rules/hivion.md` |
| Cloud session | the vendored copy, committed in the repository | `.claude/rules/hivion.md` |
| Routine | the vendored copy, because a routine is a cloud session | `.claude/rules/hivion.md` |
| Cowork | the plugin, added on the Cowork Plugins page from `nikiteshjain19/agent-scaffold` | the plugin hook |

**A repository uses one route, never both.** With both, each skill loads twice: once as
`hivion:<name>` and once as `<name>`.

### The `workflow` skill — #18, shape 1

- One skill holds every rule that `CLAUDE.md` and `STYLE.md` hold today. Its `SKILL.md` holds the
  golden rules and an index. One reference file holds each other section (contract C1).
- A skill loads on demand. So a section costs context only when a citing skill needs it.
- The rule text moves unchanged. Only the citations change: a section number becomes a section name
  (contract C2). A numbered item inside a section keeps its number, so escalation condition 6 stays
  condition 6.
- `CLAUDE.md` and `STYLE.md` stay in this repository, for a human reader. After the last skill stops
  citing them, `CLAUDE.md` becomes this repository's own entry file. It imports the `workflow`
  skill's files with `@` lines, so a session in this repository still loads the rules. `STYLE.md`
  becomes a short pointer. No skill depends on either file.
- Between story S1 and story S9, `CLAUDE.md` and the `workflow` skill hold the same rules twice.
  **Freeze both for that time.** Only a story in this plan edits either one.

### The invariants — #18, the rules that must hold unprompted

- The invariants are nine short rules (contract C3). They send the agent to the `workflow` skill
  for detail. They restate only what an agent must never do before it loads that skill.
- The plugin hook prints the file on every session source (contract C4).
- The file stays at or under 4,000 characters, well inside the 10,000-character cap. A lint check
  enforces the limit, because text over the cap reaches the agent only as a 2,000-character preview.
- The vendored copy carries the same file as `.claude/rules/hivion.md`, which loads at launch with
  no hook.

### The vendored copy — #17, route 1

- `tools/hivion-vendor.sh` runs in a checkout of this repository, at a release tag. It copies the
  skills from the checked-out commit into a consuming repository's `.claude/skills/`. It copies the
  invariants to `.claude/rules/hivion.md`. It writes `.claude/hivion/manifest` and
  `.claude/hivion/check.sh` (contracts C5 and C6).
- **The manifest is the version marker.** It names the source, the version, the tag and the commit.
  It records the git object id of each vendored path at that commit.
- **The drift check is `check.sh`.** It compares each recorded id with `git rev-parse HEAD:<path>`
  in the consuming repository. A git object id depends only on content, so equal ids prove an
  unedited copy. The check needs only `sh` and `git`.
- Invariant 9 tells an agent to run the check before its first workflow action, when the check
  exists. A consuming repository can also run it in CI.
- The tools live in `tools/`, at the repository root and outside the plugin. So the plugin cache
  stays free of them (D-48), and Cowork can still install the plugin.
- `tools/test-vendor.sh` tests both scripts, with the failure branches. `npm test` runs it. The
  `Markdown lint` job runs `npm test` after `npm run lint`, so the green signal covers it. The job
  keeps its name, because the ruleset on `main` requires that check by name.

### Consequences accepted

- A repository that vendors commits about 7,000 lines of skills, and re-runs the script to upgrade.
- Every pull request waits for the owner. Parallel stories buy concurrent work, not concurrent
  merges.
- The `§N` convention ends. Private D-37 set it. D-18 records the change in this repository's log,
  and cannot write a back-reference to the private log.
- The pre-PR gate becomes `npm ci && npm run lint && npm test`.
- A consumer no longer copies `CLAUDE.md`. A consumer that already copied it keeps a stale copy
  until it deletes the file.
- #14 and #19 name `CLAUDE.md` §6, §9 and `STYLE.md` as their homes. Their instructions become
  false when S1 and S9 merge, and they need new text before they start.

## Rejected

- **#18 shape 2, each skill carries its own rules:** eight copies of shared rules drift, which is
  why the rules were factored into one file.
- **#18 shape 3, shared files at the plugin level, outside any skill:** a skill can address such a
  file only through `${CLAUDE_PLUGIN_ROOT}`, which a vendored copy does not have.
- **Keep `CLAUDE.md` as the source and generate the skill from it:** two committed copies, plus a
  generator to maintain and test.
- **Inject the whole rule set from a hook:** `CLAUDE.md` alone is 55,543 characters, over five
  times the 10,000-character cap.
- **A rules skill with no hook:** a rule binds only after something loads the skill. An agent could
  merge without the gate because nothing loaded it.
- **#17 route 2, skills enabled on the claude.ai account:** per person and unversioned, invisible
  to the repository, and it covers no collaborator.
- **#17 route 3, a repository `SessionStart` hook that fetches the skills:** a failed fetch leaves
  a session with no rules and no sign of it. Repository hooks run only in a one-repository session,
  and the routine documentation is silent on hooks.
- **#17 route 4, a setup script on the cloud environment:** it is set per environment, not per
  repository, and it is skipped when a cached environment exists.
- **A vendored copy with no drift check:** an edited copy reads exactly like the release it claims.
- **An npm package or another installer:** this project publishes nothing to npm (`package.json`
  is `"private": true`).

## Contracts

Each contract is frozen. A change after approval needs a new plan version and a new approval.

### C1 — the `workflow` skill's files and section names

Each reference file opens with a level-1 heading that is its section name, exactly as written
here. `SKILL.md` lists every section name with a relative link to its file.

| File, under `plugins/hivion/skills/workflow/` | Section name | Moved from |
| --- | --- | --- |
| `SKILL.md` | Golden rules | `CLAUDE.md` §1, and the "Project-specific context" closing section |
| `references/bootstrap.md` | Project bootstrap | `CLAUDE.md` §0 |
| `references/tickets.md` | Ticket workflow | `CLAUDE.md` §2 |
| `references/branches.md` | Branch and git workflow | `CLAUDE.md` §3 |
| `references/implementation.md` | Picking up a ticket | `CLAUDE.md` §4 |
| `references/dependencies.md` | Dependencies and build order | `CLAUDE.md` §5 |
| `references/merge-gate.md` | Merge gate | `CLAUDE.md` §6 |
| `references/decision-log.md` | Decision log | `CLAUDE.md` §7 |
| `references/secrets.md` | Secrets | `CLAUDE.md` §8 |
| `references/writing-style.md` | Writing style | `CLAUDE.md` §9 |
| `references/house-style.md` | House style | `STYLE.md`, whole file |
| `references/spend.md` | Spend guardrails | `CLAUDE.md` §10 |
| `references/testing.md` | Testing policy | `CLAUDE.md` §11 |
| `references/skill-names.md` | Skill names | `CLAUDE.md` §12 |
| `references/escalation-queue.md` | Escalation queue | `CLAUDE.md` §13 |

The `SKILL.md` frontmatter is:

```yaml
---
name: workflow
description: >-
  The rules of the hivion workflow: tickets, branches, pull requests, the two-tier merge gate,
  the decision log, testing, secrets and the house style. Load it before you create a ticket, a
  branch, a commit, a pull request, a review or a merge, and when PROJECT.md is missing or the
  user says "start new project". Every other hivion skill cites its sections by name.
---
```

### C2 — the citation form

- **From another skill:** `` the `workflow` skill, "<Section name>" ``.
- **To a numbered item:** `` the `workflow` skill, "<Section name>", <item label> <n> ``. Example:
  `` the `workflow` skill, "Merge gate", escalation condition 6 ``.
- **Inside the `workflow` skill:** `"<Section name>"`, or `"<Section name>", <item label> <n>`.
- **Never write** a `§N` for a workflow rule, a path to a skill file, or `CLAUDE.md` or `STYLE.md`
  as the source of a rule.
- A bare `§N` stays legal only for a section of the skill that writes it, or as
  `` the `<skill>` skill's §N `` for another skill. Those numbers travel with the plugin.

### C3 — the invariants text

`plugins/hivion/hooks/invariants.md` holds exactly this text:

```markdown
# hivion — the rules that hold in every session

This repository uses the hivion workflow. These rules hold before any skill loads. The `workflow`
skill holds the full rules, and it decides when this text and that skill differ.

1. Load the `workflow` skill before you create a ticket, a branch, a commit, a pull request, a
   review or a merge. Follow the section that the action needs.
2. If `PROJECT.md` is missing, load the `workflow` skill and run its "Project bootstrap" first.
3. Never push to the default branch. Every change goes through a branch and a pull request.
4. Never merge a pull request you authored.
5. Merge only through the `workflow` skill's "Merge gate". An escalated pull request merges only
   after the user approves that pull request, by number or title.
6. If a merge-gate condition cannot be evaluated, treat it as met, and escalate.
7. Never disable, skip or weaken a test to make a check pass.
8. Never print a secret: a key, a token, a password, or the contents of an `.env` file.
9. If `.claude/hivion/check.sh` exists, run `sh .claude/hivion/check.sh` before your first action
   under rule 1. If it exits non-zero, stop, and report the paths it names to the user.
```

### C4 — the plugin hook

`plugins/hivion/hooks/hooks.json` holds exactly this text. With no `matcher`, the hook runs for
every session source.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat \"${CLAUDE_PLUGIN_ROOT}/hooks/invariants.md\""
          }
        ]
      }
    ]
  }
}
```

### C5 — the vendored layout in a consuming repository

| Path in the consuming repository | Content |
| --- | --- |
| `.claude/skills/<name>/` | one directory per skill under `plugins/hivion/skills/`, identical to it at the source commit |
| `.claude/rules/hivion.md` | identical to `plugins/hivion/hooks/invariants.md` at the source commit |
| `.claude/hivion/check.sh` | identical to `tools/hivion-check.sh` at the source commit |
| `.claude/hivion/manifest` | the format below |

The manifest is plain text, one record per line, with fields split by one space:

```text
# hivion vendored copy. Written by tools/hivion-vendor.sh. Do not edit.
source nikiteshjain19/agent-scaffold
version <the version field of plugins/hivion/.claude-plugin/plugin.json>
ref <the tag that points at the source commit, or the word untagged>
commit <the 40-hex source commit>
tree .claude/skills/<name> <40-hex tree id of plugins/hivion/skills/<name> at the source commit>
blob .claude/rules/hivion.md <40-hex blob id of plugins/hivion/hooks/invariants.md>
blob .claude/hivion/check.sh <40-hex blob id of tools/hivion-check.sh>
```

There is one `tree` line per skill, in name order. A line that starts with `#` is a comment.

### C6 — the two scripts

**`sh tools/hivion-vendor.sh <consuming-repository-root>`**, run from the root of an
agent-scaffold checkout:

- Reads every file from `HEAD` with `git archive`, never from the working tree.
- Writes the C5 paths, and commits nothing. Prints each path it wrote.
- Removes a `.claude/skills/<name>/` that the old manifest lists and the new source lacks.
- Exit `0`: the copy is written.
- Exit `1`: refused, and nothing is written. It refuses when a `.claude/skills/<name>/` exists that
  no existing manifest lists, or when `.claude/rules/hivion.md` exists with no manifest.
- Exit `2`: a usage error. No argument, or the argument is not the root of a git work tree.

**`sh .claude/hivion/check.sh`**, run from the root of the consuming repository:

- For each `tree` and `blob` line, compares the recorded id with `git rev-parse HEAD:<path>`.
- Exit `0`: every id matches.
- Exit `1`: drift. Prints `drift <path>` for each path that differs or is missing.
- Exit `2`: the manifest is missing, or a line does not parse. A failure to read counts as a
  failure, never as a pass.
- Uses POSIX `sh` and `git`, and nothing else.

### C7 — the citation map

| `CLAUDE.md` today | C2 form |
| --- | --- |
| §0 | `` the `workflow` skill, "Project bootstrap" `` |
| §1, rule N | `` the `workflow` skill, "Golden rules", rule N `` |
| §2 | `` the `workflow` skill, "Ticket workflow" `` |
| §3 | `` the `workflow` skill, "Branch and git workflow" `` |
| §4, §4.N | `` the `workflow` skill, "Picking up a ticket" ``, and step N |
| §5, rule N | `` the `workflow` skill, "Dependencies and build order", rule N `` |
| §6, with a check, condition or gate rule | `` the `workflow` skill, "Merge gate" ``, and `pre-merge check N`, `escalation condition N` or `approval gate rule N` |
| §7 | `` the `workflow` skill, "Decision log" `` |
| §8 | `` the `workflow` skill, "Secrets" `` |
| §9 | `` the `workflow` skill, "Writing style" `` |
| `STYLE.md` | `` the `workflow` skill, "House style" `` |
| §10 | `` the `workflow` skill, "Spend guardrails" `` |
| §11, rule N | `` the `workflow` skill, "Testing policy", rule N `` |
| §12 | `` the `workflow` skill, "Skill names" `` |
| §13 | `` the `workflow` skill, "Escalation queue" `` |

## Stories

Every story runs the pre-PR gate in force when it starts: `npm ci && npm run lint` until S8
merges, and `npm ci && npm run lint && npm test` after. A docs-only story states the test
exemption from the `workflow` skill, "Testing policy", rule 4, or `CLAUDE.md` §11 rule 4 before S1
merges.

### Waves

Lane budget: 5, from `PROJECT.md`, "Merge gate" → "Parallelism". A wave is not a barrier. A story
starts when the stories in its "Blocked by" column have merged.

| Wave | Story | Outcome | Footprint | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | S1 | The `workflow` skill exists and holds every rule | `plugins/hivion/skills/workflow/` (the C1 files); `plugins/hivion/.claude-plugin/plugin.json` ("description"); `.claude-plugin/marketplace.json` ("description"); `CLAUDE.md` (§0, the sentence on `§N` citations); `README.md` ("What's here"); `PROJECT.md` ("Product", "Purpose"); `decisions.d/<date>-18.md`; `decisions.d/2026-09-23-1.md` | none |
| 2 | S2 | `issue-writer` cites the `workflow` skill | `plugins/hivion/skills/issue-writer/SKILL.md` | S1 |
| 2 | S3 | `issue-loop` cites the `workflow` skill | `plugins/hivion/skills/issue-loop/SKILL.md`; `plugins/hivion/skills/issue-loop/references/stacked-lane.md` | S1 |
| 2 | S4 | `pr-reviewer` cites the `workflow` skill | `plugins/hivion/skills/pr-reviewer/SKILL.md` | S1 |
| 2 | S5 | `pr-merge-loop` cites the `workflow` skill | `plugins/hivion/skills/pr-merge-loop/SKILL.md`; `plugins/hivion/skills/pr-merge-loop/references/` (`conflict.md`, `repair.md`, `review-card.md`, `stacked-pairs.md`) | S1 |
| 2 | S6 | The plugin hook prints the invariants | `plugins/hivion/hooks/hooks.json`; `plugins/hivion/hooks/invariants.md`; `.github/scripts/check-invariants-size.mjs`; `package.json` (`scripts.lint`) | S1 |
| 3 | S7 | Four more skills cite the `workflow` skill | `plugins/hivion/skills/feature-plan/SKILL.md`; `plugins/hivion/skills/cycle-manager/SKILL.md`; `plugins/hivion/skills/project-onboard/SKILL.md`; `plugins/hivion/skills/project-audit/SKILL.md` | S1 |
| 3 | S8 | A consuming repository can vendor the skills and check the copy | `tools/hivion-vendor.sh`; `tools/hivion-check.sh`; `tools/test-vendor.sh`; `package.json` (`scripts.test`); `.github/workflows/lint.yml` (one `npm test` step); `PROJECT.md` ("Build / lint / test commands"; "Merge gate" → "Green signal") | S6 |
| 4 | S9 | No file outside the plugin is a rule source. Closes #18 | `CLAUDE.md`; `STYLE.md`; `PROJECT.md` (every `CLAUDE.md` citation; "Milestones / build sequence"; "Constraints & working style"; the closing line); `README.md` ("What's here"; "Use the workflow"; "What a project owes the workflow"); `.markdownlint-cli2.yaml` (the MD029 comment) | S2, S3, S4, S5, S7, S8 |
| 5 | S10 | Each route works in a real session. No repository file | none: a non-code story, whose deliverable is an evidence comment on #17 | S9 |
| 6 | S11 | `README.md` states the coverage, and D-17 records the routes. Closes #17 | `README.md` ("Install the plugin"; "Cloud sessions do not install this plugin"); `PROJECT.md` (the scope note under the title); `decisions.d/<date>-17.md`; `decisions.d/2026-09-23-1.md` | S10 |

**Disjointness, shown.** Wave 2 writes five disjoint sets: three single skill files, the
`pr-merge-loop` directory, and the S6 hook files with `package.json`. Wave 3 writes four skill files
(S7) and `tools/`, `package.json`, `lint.yml` and `PROJECT.md` (S8). The files that several stories
write are `PROJECT.md` (S1, S8, S9, S11), `README.md` (S1, S9, S11), `package.json` (S6, S8) and
`decisions.d/2026-09-23-1.md` (S1, S11). One "Blocked by" chain orders each group:
S1 → S6 → S8 → S9 → S10 → S11.

**Size.** S1, S2, S3, S4, S5, S7 and S9 each exceed the size threshold of 50 lines or 3 files. Every
story escalates on the risk list anyway.

### S1 — create the `workflow` skill

Honours C1, C2 and C7.

1. `plugins/hivion/skills/workflow/` holds exactly the C1 files, and each reference file opens with
   its C1 heading.
2. Every rule in `CLAUDE.md` and `STYLE.md` appears in the skill with its wording unchanged, except
   its citations, which follow C2. The PR shows how this was compared.
3. `grep -rnE '§ ?[0-9]' plugins/hivion/skills/workflow` returns nothing.
4. A local session with the plugin installed from the branch lists `hivion:workflow`. The PR quotes
   the `claude plugin validate` output.
5. `decisions.d/<date>-18.md` records the inversion, shape 1, the rejected shapes and the end of the
   `§N` convention. D-1 carries "Corrected by: D-18" on its `CLAUDE.md` open item.
6. `plugin.json`, `marketplace.json`, `README.md` and `PROJECT.md` name nine skills and the
   `workflow` skill. `CLAUDE.md` §0 no longer tells a skill to cite it by number.

### S2, S3, S4, S5 and S7 — each skill cites the `workflow` skill

Honour C2 and C7. Each story applies these checks to the files in its own footprint.

1. `` grep -nE 'CLAUDE\.md`? ?§|STYLE\.md' <each file> `` returns nothing.
2. Each former `CLAUDE.md` citation reads in the C2 form, with the C7 section name.
3. Each bare `§N` left in the file names a section of that skill, or of another skill by name.
4. Each remaining mention of `CLAUDE.md` names a consuming repository's own file, never a rule
   source.
5. No rule text changes. The diff changes citations only.
6. The pre-PR gate passes.

### S6 — the plugin hook prints the invariants

Honours C3 and C4.

1. `hooks.json` matches C4, and `invariants.md` matches C3, byte for byte.
2. A local session with the plugin installed from the branch shows the invariants in its context
   after start, `/clear` and `/compact`. The PR says how this was seen.
3. `npm run lint` fails when `invariants.md` exceeds 4,000 characters. The PR shows that failure,
   then the pass at the C3 text.
4. `claude plugin validate` reports no hook warning. The PR quotes the output.

### S8 — vendor the skills, and check the copy

Honours C5 and C6. `tools/test-vendor.sh` asserts items 1 to 5 against a temporary git repository.

1. Vendoring into an empty repository writes exactly the C5 paths, and the manifest parses as C5.
2. `check.sh` exits `0` on the committed copy.
3. `check.sh` exits `1` and names the path after one vendored file is edited and committed. It exits
   `2` with no manifest.
4. The vendor script exits `1` and writes nothing when an unlisted `.claude/skills/<name>/` exists.
5. A re-vendor removes a skill directory that the old manifest lists and the new source lacks.
6. `npm test` runs the test. The `Markdown lint` job runs `npm test`, and keeps its name.
   `PROJECT.md` states the new pre-PR gate.

### S9 — retire `CLAUDE.md` and `STYLE.md` as rule sources

Honours C1 and C2. Closes #18.

1. `` grep -rnE 'CLAUDE\.md`? ?§|STYLE\.md' plugins `` returns nothing.
2. `CLAUDE.md` holds a short introduction and one `@` import for each C1 file. `STYLE.md` points to
   the `workflow` skill, "House style".
3. In a scratch repository with the plugin from the branch and no `CLAUDE.md`, each skill runs its
   first phase, and cites no rule it cannot reach. The PR says how this was run.
4. `claude plugin validate .` reports no warning about a plugin-root `CLAUDE.md`.
5. `PROJECT.md`, `README.md` and `.markdownlint-cli2.yaml` cite no `CLAUDE.md` section number.
6. The PR names the sections that remain in `CLAUDE.md` alone, and why no skill needs them.

### S10 — prove each route in a real session

A non-code story. It needs a person with access to cloud sessions, routines and Cowork.

1. A scratch consuming repository holds a vendored copy of `main` at a named commit, and
   `sh .claude/hivion/check.sh` exits `0`.
2. A cloud session on that repository lists the nine skills, and its context holds the invariants.
3. A routine on that repository does the same.
4. Cowork adds the marketplace `nikiteshjain19/agent-scaffold`, installs `hivion`, lists
   `hivion:workflow`, and shows the invariants.
5. A local session with the plugin from `main` shows the invariants after start and after
   `/compact`.
6. The evidence comment on #17 names each surface and how each item was seen. A failure stops S11,
   and returns this plan to the Architect.

### S11 — state the coverage, and record the routes

Closes #17.

1. `README.md` states the route and the coverage for local, cloud, routine and Cowork, before the
   install snippet.
2. `README.md` gives the vendor, upgrade and drift-check commands.
3. `decisions.d/<date>-17.md` names the route for each surface, the rejected routes and the S10
   evidence. D-1 carries "Corrected by: D-17", and its cloud open item reads as closed.
4. No document describes a surface as open.
5. The pre-PR gate passes.

## Risks

- **S10 needs a person.** No agent on the team can open a cloud session, a routine or a Cowork
  session today. Early signal: ask the owner before S8 merges who runs S10.
- **The documented carry-over may not hold in practice.** Early signal: copy one skill and one rule
  file into a scratch repository by hand, and open one cloud session. This costs ten minutes, and
  needs no story.
- **A release cut mid-plan ships a mix of citation forms.** Cut no release until S9 merges.
- **The invariants restate a few golden rules, and the two copies can drift.** C3 says the
  `workflow` skill decides. The reviewer of any later change to one checks the other.
- **A vendored skill name can collide with a consuming repository's own skill.** The vendor script
  refuses, and writes nothing.
- **A cloud session with several repositories, or a routine with several, may not load each clone's
  `.claude/skills/`.** The documentation is silent. `README.md` claims one-repository coverage
  only.
- **The hook needs a POSIX shell for `cat`.** Its behaviour on Windows is not verified.
- **A rule file's reload after `/compact` is not documented.** Only the project-root `CLAUDE.md` is
  documented to reload. S10 item 5 tests the plugin hook. A vendored repository can add C4 to its own
  `.claude/settings.json` if a test shows the rule file is lost.

## Out of scope

- The release that ships this work: the version bump, `CHANGELOG.md`, the tag and the GitHub
  Release.
- New text for #14 and #19.
- Organization-wide distribution through claude.ai.
- Cloud sessions and routines with several repositories.
- Automatic upgrade of a vendored copy.
- Windows support for the hook and the scripts.
- Renumbering the skills' own sections.

## References

- `CLAUDE.md` — §0 "Project Bootstrap", §1 "Golden rules", §6 "Pull requests & pre-merge review",
  §7 "Decision log", §12 "Skills — addressed by name, never by path".
- `STYLE.md` — "Scope — where this applies", "The rules".
- `PROJECT.md` — "Toolchain", "Build / lint / test commands", "Merge gate", "Parallelism",
  "Releases".
- `README.md` — "Install the plugin", "Cloud sessions do not install this plugin", "Use the
  workflow".
- `plugins/hivion/.claude-plugin/plugin.json`; `.claude-plugin/marketplace.json`.
- `plugins/hivion/skills/feature-plan/SKILL.md` — "5. PRESENT AND STOP".
- `.github/workflows/lint.yml` — job `Markdown lint`; `package.json` — `scripts.lint`;
  `.markdownlint-cli2.yaml` — MD029.
- Decisions: D-1, D-9, D-46, D-47, D-48, D-51, D-60, D-79; private D-37.
- Issues: #17, #18, #14, #19.
- Claude Code documentation, read 2026-10-07: cloud-environments, routines, hooks, skills, memory,
  plugins/components, plugins/loading, plugins/manifest-reference; Cowork plugins guide; plugins
  platform-support.
