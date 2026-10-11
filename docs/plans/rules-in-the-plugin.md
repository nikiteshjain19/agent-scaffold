# Rules in the plugin, skills in every session — plan

Status: approved v1 — "approve the plan", 2026-10-10

## Context

Two open issues, planned together on the owner's direction (2026-10-04, re-confirmed 2026-10-10):

- **#18** — every skill cites `CLAUDE.md` by `§N`, and the plugin cannot install `CLAUDE.md`. A
  repository that installs `hivion` without copying that file gets skills whose rule citations
  resolve to nothing.
- **#17** — a cloud session installs no plugin a repository declares, so the skills reach local
  sessions only. Cloud sessions, routines and Cowork get nothing.

Both issues were written on 2026-10-03 and 2026-10-04. Since then #34 and #60–#68 merged, the plugin
moved to `plugins/hivion/`, five `references/` files appeared, and `CHANGELOG.md` and a release
procedure landed. This plan reconciles both issues against `main` at `237bf16` before designing.

**Who it is for:** anyone who installs `hivion`, in any Claude Code surface.

**Done for v1:**

- A repository with the plugin installed and no `CLAUDE.md` runs every skill, and no skill cites a
  rule it cannot reach.
- The rules that must hold unprompted reach every local session through a plugin hook.
- A cloud session and a routine on a consuming repository list the skills, proved in a real cloud
  session.
- `README.md` states the coverage per surface before the install snippet.

### Reconciliation — what changed in each issue since it was written

| Issue | Statement in the issue | State on `main` today | Effect on this plan |
| --- | --- | --- | --- |
| #18 | 292 `§N` references across eight skills | 431 `§N` tokens across 8 skills and 5 reference files. At least 182 name `CLAUDE.md` on the same line; most of the rest are a skill citing its own sections | The rewrite targets the `CLAUDE.md` citations only. A skill's citations of its own sections stay |
| #18 | "plus the reference files #63 and #64 create" | They exist: `issue-loop/references/stacked-lane.md` and four under `pr-merge-loop/references/` | Each one is in a rewrite unit's footprint |
| #18 | Shape 3 needs verifying: can a skill reference a file outside its own directory? | Verified: `${CLAUDE_PLUGIN_ROOT}` is substituted in plugin skills only. `${CLAUDE_SKILL_DIR}` is substituted wherever the skill is installed | Shape 3 breaks the moment a skill is copied outside the plugin, which #17 needs. Shape 1 is chosen |
| #18 | Hook text is capped | Verified: 10,000 characters per hook output. `CLAUDE.md` is 55,543 characters; §6 alone is 19,752 | The hook carries a small core of rules, never the workflow |
| #18 | `README.md` and `PROJECT.md` become false | Also false: `CHANGELOG.md`'s 0.2.0 upgrade note ("Re-copy `CLAUDE.md`"), `.markdownlint-cli2.yaml`'s MD029 comment, `PROJECT.md` "Product" and its scope note | Named in footprints. `CHANGELOG.md` is left to the next release pull request (`PROJECT.md`, "Releases") |
| #18 | Not mentioned | The new-project interview lives only in `CLAUDE.md` §0. Four skills send a project with no `PROJECT.md` there | The interview moves into the rules skill |
| #18 | Not mentioned | Two skills cite `STYLE.md`, which the plugin does not ship either | `STYLE.md` moves into the rules skill. #14's footprint then points at the new path |
| #18 | Footprint `plugins/hivion/` as one entry | Too wide to share a wave with anything | Split into disjoint per-skill units |
| #17 | Cites `.claude/settings.json` in this repository | This repository commits no `.claude/` directory | The reference is to a consuming repository's file. No change needed |
| #17 | Route 3: a hook writes files, then the session reads them — unverified | Still not documented | Rejected: a setup or hook step that writes skills is not documented to take effect in the same session |
| #17 | "How skills are enabled on a claude.ai account" — unverified | Documented: Cowork and cloud sessions load the skills enabled on the claude.ai account, managed from **Customize** or the claude.ai skills settings | Cowork's route is the account. Organization-wide provisioning is still undocumented, and stays out of scope |
| #17 | Footprint "whatever the chosen route adds" | No path named | This plan names every path |
| D-1 | "The skills cite the workflow file about forty times" | 182 or more | The spike's decision entry `Corrects` D-1 |
| D-67 | "The path-and-numbering constraint … can retire once #18 removes the `§N` citations" | Still in the `project-onboard` skill | The `project-onboard` rewrite unit retires it |

## The system today

- **The plugin** is `plugins/hivion/`: a manifest at `.claude-plugin/plugin.json` (version `0.2.0`)
  and eight skills under `skills/`. The marketplace at the repository root points at it (D-48). No
  hook, no script, no shared file.
- **The rules** are `CLAUDE.md`, 14 numbered sections. The skills cite §6 (61 times), §13 (22),
  §11 (19), §0 (17), §7 (15), §8 (10), §5 (10), §4 (8), §3 (7), §2 (4), §10 (4), §12 (3), §9 (1)
  and §1 (1). A consuming repository copies `CLAUDE.md` by hand (`README.md`, "Use the workflow").
- **The house style** is `STYLE.md`, cited by the `issue-writer` and `pr-reviewer` skills. The
  plugin does not ship it.
- **Reference files** sit in a skill's own `references/` directory and are cited by a relative
  path, such as `references/stacked-lane.md`. No skill reads another skill's files.
- **Cross-skill citation** is by name in backticks, such as the `pr-reviewer` skill. A
  namespaced entry such as `hivion:pr-reviewer` satisfies a bare-name citation (D-9).
- **The green signal** is `Markdown lint`: `npm ci && npm run lint`. It checks form, never meaning.
- **Every path this plan touches is risk-listed**: `plugins/**`, `CLAUDE.md`, `STYLE.md`,
  `PROJECT.md`, `README.md`, and `decisions.d/**` for an edited entry. **Every unit escalates to
  the owner.** The waves buy concurrent building, never concurrent merging. The owner reviews each
  pull request.
- **This repository runs the installed plugin**, version `0.2.0`, while it edits `main`. A rule
  merged here governs this repository's own agents only after a release.

## Design

Make the plugin the only authority for its rules. A new `workflow` skill (proposed) holds every
rule `CLAUDE.md` holds today, the new-project interview and the house style. Every other skill cites
it by name and by section heading, never by number or path. A plugin `SessionStart` hook injects a
short core of rules that must hold before anything loads the `workflow` skill (proposed). The core
is under 4,000 characters, and its last line tells the agent to load that skill before any ticket,
branch, pull request, review or merge. For the surfaces where a plugin cannot reach, a vendor script
copies the released skills into a consuming repository's `.claude/skills/`. It also copies the core
into `.claude/rules/hivion-core.md` and writes a version marker. A `check` mode reports drift. Cowork
gets the same skills through the claude.ai account. `CLAUDE.md` in this repository shrinks to this
repository's own instructions, and imports the `workflow` skill (proposed) from the working tree. So
this repository is governed by `main`'s rules, not by the installed release.

### Route per surface

| Surface | Skills reach it by | Core rules reach it by | Who sets it up |
| --- | --- | --- | --- |
| Local session | The plugin | The plugin's `SessionStart` hook | Each person, once (`/plugin install`) |
| Cloud session | `.claude/skills/`, vendored and committed | `.claude/rules/hivion-core.md`, vendored and committed | The repository, once per release |
| Routine | Same as a cloud session: a routine is a cloud session on a clone | Same as a cloud session | The repository |
| Cowork | Skills enabled on the claude.ai account | Not delivered. The `workflow` skill (proposed) loads on demand only | Each person, on claude.ai |

### What `CLAUDE.md` becomes

In this repository, `CLAUDE.md` keeps only what is about this repository, plus imports:

```markdown
@plugins/hivion/hooks/core.md
@plugins/hivion/skills/workflow/SKILL.md
```

A consuming repository needs no `CLAUDE.md` from the scaffold. It may keep its own for its own
facts. No skill depends on it.

### Consequences accepted

- **A rule binds only once something loads it.** The hook core covers the rules that must hold
  unprompted. Every other rule binds when a skill, or the core's last line, loads the `workflow`
  skill (proposed).
- **A vendored copy can drift.** The marker and the `check` mode make drift visible, and they do
  not prevent it. A consuming repository runs `check` in its own CI, or not at all.
- **A local session with both the plugin and a vendored copy lists each skill twice**:
  `pr-reviewer` and `hivion:pr-reviewer`. Under D-9 both are the same skill. If the two versions
  differ, the session may load either one. The spike measures which wins.
- **Cowork gets no core.** Cowork runs no repository hook. That surface is honestly weaker, and
  `README.md` says so.
- **A consumer's adoption is not automatic.** A consumer that copied `CLAUDE.md` keeps an old copy
  until it deletes it. The next release's upgrade note says so (`PROJECT.md`, "Releases").
- **Every `CLAUDE.md` §N citation in an open issue goes stale**, including #14's and #19's. Each is
  rewritten when that issue is picked up, not by this plan.

## Rejected

- **Shape 2, each skill carries the rules it enforces** — eight copies of the merge gate drift, and
  factoring them out is why `CLAUDE.md` exists.
- **Shape 3, shared files under the plugin root, cited by `${CLAUDE_PLUGIN_ROOT}`** — that variable
  is substituted in plugin skills only. A vendored copy (cloud) or an account skill (Cowork)
  would cite a path that does not resolve.
- **Inject the whole workflow through the hook** — 55,543 characters against a 10,000-character
  cap. Above the cap, Claude Code substitutes a file path and a 2,000-character preview.
- **Keep `CLAUDE.md` full and generate the `workflow` skill (proposed) from it** — two copies of
  every rule, and a generator this repository would own forever. The skill is the one source.
- **Cloud route 3: a repository `SessionStart` hook that fetches the skills** — whether skills
  written during `SessionStart` are discovered in that same session is undocumented. The docs say
  a new skills directory needs `/reload-skills`. It also fetches on every session start.
- **Cloud route 4: a cloud environment setup script** — configured per environment, not per
  repository, so it covers the owner's environments and not a collaborator's. It also cannot
  install a plugin.
- **Cloud route 2 alone: claude.ai account skills** — per person, unversioned and invisible to the
  repository. It is kept for Cowork only, where nothing else reaches.
- **Vendor the whole `plugins/hivion/` tree** — the hook, manifest and scripts do nothing outside a
  plugin. Copying them adds files with no consumer (`CLAUDE.md` §5 rule 3).
- **Rewrite all eight skills in one unit** — one unit touching 13 files cannot share a wave with
  anything, and it exceeds the six-check bound. Four disjoint units build in parallel.

## Contracts

**Frozen.** Changing any contract below after approval needs re-approval. That change is a new
decision entry that `Supersedes` or `Corrects` this plan's entry, and names that entry's file in
its footprint.

### K1 — the rules skill's identity

- Directory: `plugins/hivion/skills/workflow/`.
- Name in frontmatter: `workflow`. Invoked as `hivion:workflow` from the plugin, and `workflow`
  from a vendored copy (D-9).
- Frontmatter `description`, verbatim:

  ```text
  The workflow rules every hivion skill cites: tickets, branches, the two-tier merge gate, the
  testing policy, the decision log, secrets, the escalation queue, the house style, and the
  interview that sets up a new project. Load it before you file a ticket, cut a branch, open,
  review or merge a pull request, or write a decision entry, and whenever a skill cites
  "the `workflow` skill".
  ```

- It reads its own reference files as `${CLAUDE_SKILL_DIR}/references/<file>.md`. Never
  `${CLAUDE_PLUGIN_ROOT}`.

### K2 — the citation form, and the section map

Cite a rule as: the `workflow` skill, "<Section>". Add a sub-heading after a comma where one exists:
the `workflow` skill, "Merge gate", "Escalation conditions". Numbered items inside a section keep
their numbers: escalation condition 6, pre-merge check 4, testing rule 10. Never cite a `§N`. Never
cite a path into the `workflow` skill (proposed) from another skill.

| `CLAUDE.md` today | Section heading in the `workflow` skill (proposed) | File |
| --- | --- | --- |
| §0 | "Project bootstrap" | `references/bootstrap.md` |
| §1 | "Golden rules" | `SKILL.md` |
| §2 | "Tickets" | `SKILL.md` |
| §3 | "Branches and commits" | `SKILL.md` |
| §4 | "Picking up a ticket"; sub-heading "Justify every line you write" | `references/implementation.md` |
| §5 | "Dependencies and build order" | `SKILL.md` |
| §6 | "Merge gate"; sub-headings "Opening a pull request", "Pre-merge checks", "Review record", "Escalation conditions", "Approval gate", "Repair", "Dependent sweep", "Auto-merge tier", "Enforcement" | `references/merge-gate.md` |
| §7 | "Decision log" | `references/decision-log.md` |
| §8 | "Secrets" | `SKILL.md` |
| §9 | "Writing style" | `SKILL.md`, pointing at `references/style.md` (today's `STYLE.md`) |
| §10 | "Spend guardrails" | `SKILL.md` |
| §11 | "Testing policy"; rules keep numbers 1–11 | `references/testing.md` |
| §12 | "Skill addressing" | `SKILL.md` |
| §13 | "Escalation queue" | `references/escalation-queue.md` |
| `CLAUDE.md` §4.2 and the like | "Picking up a ticket", step 2 | as above |

`SKILL.md` opens with an index: one line per section, naming its file. A reader that loads the
skill finds every section from that index.

### K3 — the hook

`plugins/hivion/hooks/hooks.json`, verbatim:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "cat \"${CLAUDE_PLUGIN_ROOT}/hooks/core.md\"" }
        ]
      }
    ]
  }
}
```

No matcher, so it fires on every `SessionStart` source. It writes plain stdout and exits 0. When
the file is missing, `cat` exits non-zero and the session starts without the core. That failure is
visible in the hook output, and the unit's verification proves the file is present.

### K4 — the core text

`plugins/hivion/hooks/core.md`. **4,000 characters or fewer**, checked with `wc -c`. It holds these
eight rules, one line each, in this order, and the closing line. The wording may tighten; the set,
the order and the closing line are frozen:

1. No ticket, no code. Every change starts with a ticket.
2. Never commit or push to the default branch. Every change goes through a branch and a pull request.
3. Never merge a pull request you authored or repaired.
4. Merge only through the merge gate. An escalated pull request needs the owner's approval of that
   pull request, by number or title.
5. Never merge to resolve uncertainty. A condition you cannot evaluate counts as met.
6. Never disable, skip, delete or weaken a test to make a check pass.
7. Never print or write a secret's raw value to any surface.
8. Read `PROJECT.md` and the decision log before you implement or merge.

Closing line, verbatim: `Before you file a ticket, cut a branch, or open, review or merge a pull
request, load the workflow skill and follow it.`

### K5 — the vendor script

`plugins/hivion/scripts/hivion-vendor.sh`, POSIX `sh`, run from a consuming repository's root.

```text
hivion-vendor.sh install <tag>
  Downloads https://codeload.github.com/nikiteshjain19/agent-scaffold/tar.gz/<tag>.
  Replaces .claude/skills/<name>/ for every directory under plugins/hivion/skills/.
  Writes .claude/rules/hivion-core.md, a copy of plugins/hivion/hooks/core.md.
  Writes .claude/hivion-version.
  Touches no other path.

hivion-vendor.sh check
  Reads the tag from .claude/hivion-version, downloads that tag, and compares every vendored path.

Marker, .claude/hivion-version, one line:  hivion <tag>

Exit codes, both modes:
  0  install done / check found no drift
  1  check found drift; prints each differing path, one per line
  2  could not run: no marker, unknown tag, download failed, or not at a repository root
```

Exit 2 is never success. A CI step that runs `check` treats 1 and 2 as failure.

## Waves

The lane budget is 5 (`PROJECT.md`, "Parallelism"). Every unit escalates, so each pull request
waits for the owner. No file appears in two units of one wave. The universally-touched-file hunt
found one candidate, `CLAUDE.md`: every unit makes part of it false. Only U8 edits it, and it runs
after every unit that removes a citation.

| Wave | Unit | Outcome | Declared footprint | Blocked by |
| --- | --- | --- | --- | --- |
| 0 | U0 Commit this plan | The plan and its decision are on `main` | `docs/plans/rules-in-the-plugin.md`; `decisions.d/<date>-<U0 id>.md` | none |
| 1 | U1 The `workflow` skill (proposed) and the hook | Every rule, the interview and the house style live in the plugin; a local session receives the core | `plugins/hivion/skills/workflow/SKILL.md`; `plugins/hivion/skills/workflow/references/` (`bootstrap.md`, `implementation.md`, `merge-gate.md`, `decision-log.md`, `testing.md`, `escalation-queue.md`, `style.md`); `plugins/hivion/hooks/hooks.json`; `plugins/hivion/hooks/core.md` | U0 |
| 1 | U2 Cloud spike | A real cloud session settles the four open facts; the routes are recorded | `decisions.d/<date>-<U2 id>.md`; `decisions.d/2026-09-23-1.md` (a `Corrected by` line) | U0 |
| 2 | U3 Rewrite the merge skills | `pr-merge-loop` cites the `workflow` skill (proposed), never `CLAUDE.md` | `plugins/hivion/skills/pr-merge-loop/SKILL.md`; `plugins/hivion/skills/pr-merge-loop/references/conflict.md`, `repair.md`, `review-card.md`, `stacked-pairs.md` | U1 |
| 2 | U4 Rewrite the review skills | `pr-reviewer` and `cycle-manager` cite the `workflow` skill (proposed) | `plugins/hivion/skills/pr-reviewer/SKILL.md`; `plugins/hivion/skills/cycle-manager/SKILL.md` | U1 |
| 2 | U5 Rewrite the backlog skills | `issue-loop` and `issue-writer` cite the `workflow` skill (proposed) | `plugins/hivion/skills/issue-loop/SKILL.md`; `plugins/hivion/skills/issue-loop/references/stacked-lane.md`; `plugins/hivion/skills/issue-writer/SKILL.md` | U1 |
| 2 | U6 Rewrite the planning skills | `feature-plan`, `project-audit` and `project-onboard` cite the `workflow` skill (proposed); D-67's numbering constraint retires | `plugins/hivion/skills/feature-plan/SKILL.md`; `plugins/hivion/skills/project-audit/SKILL.md`; `plugins/hivion/skills/project-onboard/SKILL.md` | U1 |
| 2 | U7 The vendor script | A consuming repository can vendor a release and check it for drift | `plugins/hivion/scripts/hivion-vendor.sh` | U1, U2 |
| 3 | U8 Shrink `CLAUDE.md` and fix this repository's documents | `CLAUDE.md` imports the rules; `STYLE.md` is gone from the root; `PROJECT.md` describes the new arrangement | `CLAUDE.md`; `STYLE.md` (deleted); `PROJECT.md` ("Product", the scope note, "Build / lint / test commands"); `.markdownlint-cli2.yaml` (the MD029 comment) | U3, U4, U5, U6 |
| 3 | U9 `README.md` per surface, proved in a cloud session | A reader learns the real coverage before installing; a cloud session on a consuming repository lists the skills | `README.md` | U3, U4, U5, U6, U7 |

**Disjointness, shown.** Wave 1: U1 writes under `skills/workflow/` and `hooks/`; U2 writes two
decision files. Wave 2: U3–U6 each own whole skill directories, and no skill appears twice. U7
writes `scripts/` only. Wave 3: U8 never touches `README.md`, and U9 touches nothing else.

**Expected over the size threshold** (50 lines or 3 files, `PROJECT.md`, "Size threshold"): U1, U3,
U4, U5, U6 and U8. It changes nothing here, because every unit escalates already.

**Merge order matters even where files do not intersect.** U3–U6 cite a skill that exists only
once U1 merges, so they wait for U1. A consumer receives none of this until a release.

## Units

### U0 — Commit this plan

- **Contracts:** none.
- **Acceptance:**
  - `docs/plans/rules-in-the-plugin.md` on `main` matches the approved plan, with the approved
    `Status` line.
  - The decision entry records the chosen design, the rejected alternatives, and points at this
    plan's Contracts section.
- **Verification:** `npm ci && npm run lint`.

### U1 — The `workflow` skill (proposed) and the hook

- **Contracts:** K1, K2, K3, K4.
- **Acceptance:**
  - Every `CLAUDE.md` section §0–§13 has a home under the K2 heading, with its rules unchanged in
    meaning. The pull request body lists any sentence that was reworded and why.
  - `references/style.md` holds `STYLE.md`'s text, unchanged.
  - The moved text cites no `§N` and no `CLAUDE.md`.
  - `wc -c plugins/hivion/hooks/core.md` prints 4000 or less.
  - In a local session with the plugin loaded from this branch, the core appears at session start.
    The pull request says how this was observed.
  - `claude plugin validate plugins/hivion` reports no error. The pull request quotes its warnings.
- **Verification:** `npm ci && npm run lint`; `claude plugin validate plugins/hivion`.

### U2 — Cloud spike

- **Contracts:** K5 (read only — it confirms the paths K5 writes).
- **Acceptance:** each answer comes from a real cloud session on a throwaway public repository the
  owner creates, not from the documentation.
  - A skill committed under `.claude/skills/` is listed, and its `${CLAUDE_SKILL_DIR}` reference
    file is read.
  - A file under `.claude/rules/` with no `paths` frontmatter is in context at session start.
  - A routine on the same repository lists the same skill.
  - Locally, with the plugin and a vendored copy both present, which copy a bare-name invocation
    loads.
  - The decision entry names the route per surface, and `Corrects` D-1's "Open, and not decided
    here" bullet about cloud sessions.
- **Verification:** `npm ci && npm run lint`. **The owner runs the cloud and routine sessions**; an
  agent has no cloud session to run.
- **If any answer is no,** stop and re-present the affected waves. U7 and U9 depend on it.

### U3 — Rewrite the merge skills

- **Contracts:** K2.
- **Acceptance:**
  - `grep -n 'CLAUDE.md' <every footprint file>` returns no line that cites a rule.
  - Every former `CLAUDE.md` citation reads in the K2 form, and names the same rule it named before.
  - A citation of the skill's own sections is unchanged.
  - The pull request body carries a before/after table of every changed citation.
- **Verification:** `npm ci && npm run lint`.

### U4 — Rewrite the review skills

- **Contracts:** K2.
- **Acceptance:** U3's four checks, for this unit's files. Also: the `pr-reviewer` skill's
  `STYLE.md` citation reads the `workflow` skill, "Writing style".
- **Verification:** `npm ci && npm run lint`.

### U5 — Rewrite the backlog skills

- **Contracts:** K2.
- **Acceptance:** U3's four checks, for this unit's files. Also: the `issue-writer` skill's
  `STYLE.md` citation reads the `workflow` skill, "Writing style". "Run `CLAUDE.md` §0" reads the
  `workflow` skill, "Project bootstrap".
- **Verification:** `npm ci && npm run lint`.

### U6 — Rewrite the planning skills

- **Contracts:** K2.
- **Acceptance:** U3's four checks, for this unit's files. Also: the `project-onboard` skill no
  longer requires a merged instruction file to keep `CLAUDE.md`'s path and numbering. D-67 named
  this constraint as retiring with #18.
- **Verification:** `npm ci && npm run lint`.

### U7 — The vendor script

- **Contracts:** K4 (the file it copies), K5.
- **Acceptance:**
  - `install <tag>` in an empty git repository writes exactly the K5 paths and nothing else.
  - `check` right after `install` exits 0.
  - `check` after one vendored file is edited exits 1, and prints that path.
  - `check` with no marker exits 2.
  - `shellcheck` reports nothing. The pull request pastes the transcript of all four runs.
- **Verification:** `npm ci && npm run lint`; `shellcheck plugins/hivion/scripts/hivion-vendor.sh`.
  The script runs against a tag that holds U1. Until a release carries U1, test against a branch
  name passed as `<tag>`.

### U8 — Shrink `CLAUDE.md` and fix this repository's documents

- **Contracts:** K2.
- **Acceptance:**
  - `CLAUDE.md` holds this repository's own instructions and the two imports in "What `CLAUDE.md`
    becomes". It holds no rule the `workflow` skill (proposed) holds.
  - A local session in this repository has the core and the `workflow` skill's text in context
    from the imports.
  - `STYLE.md` is deleted.
  - `PROJECT.md`'s "Product", its scope note and its §11 citation describe the new arrangement.
  - `.markdownlint-cli2.yaml`'s MD029 comment cites the `workflow` skill, "Testing policy".
  - `grep -rn '§[0-9]' --include=*.md plugins/` finds no citation of `CLAUDE.md`.
- **Verification:** `npm ci && npm run lint`.

### U9 — `README.md` per surface, proved in a cloud session

- **Contracts:** K5 (the commands it documents).
- **Acceptance:**
  - Before the install snippet, `README.md` has the "Route per surface" table, Cowork's weaker
    coverage included.
  - It documents `hivion-vendor.sh install` and `check`, and a CI line that runs `check`.
  - It no longer tells a reader to copy `CLAUDE.md`. The `STYLE.md` link points at the new path.
  - A cloud session on a consuming repository, vendored by U7's script, lists the skills. The pull
    request says how the owner proved it.
- **Verification:** `npm ci && npm run lint`.

## Risks

- **The spike says no.** If `.claude/rules/` is not loaded, or `${CLAUDE_SKILL_DIR}` does not
  resolve in a vendored copy, the cloud route changes. U2 runs in wave 1, in parallel with U1, so a
  no shows before any cloud unit is built.
- **A rule changes meaning in the move.** U1 moves 55,543 characters. The before/after rule map
  and the owner's review are the guard. No check proves meaning (`PROJECT.md`, "Green signal").
- **This repository runs the installed release.** Until a release carries U1–U6, the `hivion:*`
  skills this repository runs still cite `CLAUDE.md` §N. U8 removes those sections. So **U8 must
  not merge before a release that carries U1–U6**, or the installed skills cite sections that no
  longer exist. Mitigation: the owner cuts a release after U3–U6 merge, then merges U8.
- **v0.3.0 is unreleased.** Fifteen or more merged pull requests wait for it. Cutting v0.3.0
  before U1 keeps this large change out of an already-large release.
- **Open issues cite `CLAUDE.md` §N.** #14 and #19 do, and #14's footprint names `STYLE.md`. Each
  is reconciled when picked up. Both stay blocked by #18 until U8 merges.
- **A double listing confuses an agent.** If the spike shows a vendored copy shadows the plugin
  unpredictably, `README.md` tells a repository to use one or the other, never both.

## Out of scope

- Provisioning skills for a whole claude.ai organization. Undocumented, and D-1 records that a
  public marketplace closes the organization path.
- Rewriting #14 and #19. They wait for U8, then take the new homes.
- Any change to `PROJECT.md`'s section names. The skills read those by name.
- The `CHANGELOG.md` entry. The next release pull request writes it (`PROJECT.md`, "Releases").
- A drift-check CI job in this repository. Nothing here vendors.

## References

- #17 and #18 — bodies and every comment, read 2026-10-10. #14 and #19 — Dependencies.
- `CLAUDE.md` — every section heading, §0 "Use the section names the skills read", §6, §7, §12.
- `STYLE.md` — whole file, size only.
- `PROJECT.md` — "Product", "Toolchain", "Build / lint / test commands", "Merge gate",
  "Parallelism", "Releases".
- `README.md` — "Use the workflow", "Cloud sessions do not install this plugin".
- `CHANGELOG.md` — "[0.2.0] - 2026-10-05", the upgrade note.
- `.markdownlint-cli2.yaml` — the MD029 comment.
- `plugins/hivion/.claude-plugin/plugin.json`; `.claude-plugin/marketplace.json`.
- `plugins/hivion/skills/*/SKILL.md` and every `references/*.md` — citation counts.
- `plugins/hivion/skills/feature-plan/SKILL.md` — "5. PRESENT AND STOP".
- Decisions: D-1, D-9, D-46, D-47, D-48, D-63, D-64, D-67, D-68.
- Claude Code docs, read 2026-10-10: `code.claude.com/docs/en/skills` ("Available string
  substitutions", "Skills in cloud sessions"); `.../plugins/components` (the plugin-root
  `CLAUDE.md` warning; plugin hooks); `.../plugins/manifest-reference` (`hooks`); `.../hooks`
  (the 10,000-character cap); `.../cloud-environments` ("What carries over", setup scripts);
  `.../routines`.
