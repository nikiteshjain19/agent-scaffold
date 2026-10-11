# Changelog

This file records what changed for a consumer of the `hivion` plugin, and `decisions.d/` records
why.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions
follow [Semantic Versioning](https://semver.org/). `PROJECT.md`, "Releases", states the version
scheme, the bump rule and the release steps. A release pull request adds each section.

## [0.3.0] - 2026-10-11

**Upgrade note.** Re-copy `CLAUDE.md` from this release, because the plugin does not carry it. The
0.3.0 skills cite rules a 0.2.0 copy lacks: §0 topic 7's risk-list line for a modified or deleted
decision entry, and §6 escalation condition 1's change-type qualifier; §4 "a shape outweighs a
caller or a test"; §0 topic 2's tracker fields and §2's `issue-writer` bootstrap exception; §6
pre-merge checks 2 and 4, which read what the default branch gained and test the merged tree; §6
approval gate rule 2's fresh verdict on a resolved head; §6 escalation condition 3, which is always
on and accepts a widening the independent reviewer approved; and §13's run-order questions. A
`PROJECT.md` footprint-enforcement setting is no longer read, because footprint checking has no
setting.

### Added

- The `pr-merge-loop` skill gains a SINGLE-PR MODE, which the `cycle-manager` skill uses to merge
  one pull request. PR #57, issue #6,
  [D-6](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-6.md).
- The `cycle-manager` skill answers a run-order question itself when every option only changes
  which agent runs next (`CLAUDE.md` §13). PR #83, issue #34,
  [D-34](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-34.md).

### Changed

- `CLAUDE.md` §0 topic 7 risk-lists a modified or deleted decision entry, never an added one, and
  §6 escalation condition 1 reads a risk-list entry's change types. PR #54, issue #27,
  [D-27](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-27.md).
- A line matching a `CLAUDE.md` §4 shape has no reason unless the acceptance criteria name it; the
  `pr-merge-loop` skill removes such a line as an R3 repair. PR #56, issue #37,
  [D-37](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-37.md).
- The `cycle-manager` skill sends every finished pull request to a merger, carries a question
  across cycles, and stops a pull request whose head moved twice. PR #59, issue #20,
  [D-20](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-20.md).
- The `pr-merge-loop` skill honours its own stops on every merge path, treats a check still
  pending after the re-poll as red, and moves CONFLICT, REPAIR, STACKED PAIRS and the review card
  into reference files. PR #76, issue #63,
  [D-63](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-63.md).
- Footprint checking is always on (`CLAUDE.md` §6 escalation condition 3). The independent reviewer
  approves a widening the PR body requests, and every approved widening is reported in bold.
  PR #84, issue #68,
  [D-68](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-07-68.md).

### Fixed

- The `pr-merge-loop` skill reads a relayed answer only for the pull request and head it names, in
  both lanes. PR #58, issue #7,
  [D-7](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-7.md).
- The `issue-writer` skill gains a bootstrap exception for the ticket that writes `PROJECT.md`,
  reads its tracker facts from `PROJECT.md`, and protects the headings the loops read. PR #70,
  issue #61,
  [D-61](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-61.md).
- The `project-audit` skill is a side-effect-free survey of what the code contains. PR #69,
  issue #65,
  [D-65](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-65.md).
- The `pr-reviewer` skill reviews the merged tree, without credentials or author context. PR #72,
  issue #62,
  [D-62](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-62.md).
- The `issue-loop` skill reserves every open pull request's files, releases every bounced claim,
  and moves the stacked lane to a reference file. PR #73, issue #64,
  [D-64](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-64.md).
- The `project-onboard` skill writes a `PROJECT.md` every other skill can run on, and keeps secret
  locations in the session. PR #71, issue #67,
  [D-67](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-67.md).
- The `cycle-manager` skill agrees with the skills it composes: one wave per cycle, a valid digest,
  and a re-review after a new decision. PR #74, issue #66,
  [D-66](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-66.md).
- The `feature-plan` skill lands a plan through its own unit, records its decisions, orders by
  links, and declares complete footprints. PR #75, issue #60,
  [D-60](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-06-60.md).
- An approved `feature-plan` design reaches the `issue-writer` skill from the working tree without
  a false stop. PR #80, issue #79,
  [D-79](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-07-79.md).
- The check environment that the `pr-reviewer` skill defines, and the `project-audit` and
  `project-onboard` skills copy, hides the host login, fetches in the ordinary shell, and runs in
  one session. PR #82, issue #78,
  [D-78](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-07-78.md).

## [0.2.0] - 2026-10-05

**Upgrade note.** Re-copy `CLAUDE.md` from this release, because the plugin does not carry it. The
0.2.0 skills cite rules a 0.1.0 copy lacks: §4 "Justify every line you write", §6 escalation
condition 8, the §0 routing, and the §7 citation forms `scaffold D-N` and `private D-N`.

### Added

- The `project-onboard` skill, which adopts the workflow into a project that already has code, a
  backlog or CI. PR #39, issue #15,
  [D-15](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-15.md).
- `CLAUDE.md` §6 escalation condition 8, an effect a revert cannot undo; §0 topic 7 proposes a
  default risk list; condition 4 names two weakened-test shapes. PR #26, issue #12,
  [D-12](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-04-12.md).
- `CLAUDE.md` §4 "Justify every line you write"; the `pr-reviewer` skill rejects a line that
  matches one of its seven shapes. PR #33, issue #11,
  [D-11](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-11.md).
- Every ticket is created through the `issue-writer` skill (`CLAUDE.md` §2), which gains a
  pre-approved path for one issue the owner already approved. PR #41, issue #30,
  [D-30](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-30.md).
- `CLAUDE.md` §7 "A citation names its log": a decision citation reads `D-N`, `scaffold D-N` or
  `private D-N`, and the skills mark every citation that way. PR #50, issue #46,
  [D-46](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-46.md).

### Changed

- `CLAUDE.md` §0 routes on the repository's state; an existing project runs the `project-onboard`
  skill instead of the new-project interview. PR #43, issue #16,
  [D-16](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-16.md).

### Fixed

- A plugin-namespaced skill (`hivion:pr-reviewer`) satisfies a bare-name citation
  (`pr-reviewer`). PR #28, issue #9,
  [D-9](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-9.md).
- Four `CLAUDE.md` contradictions resolved: golden rule 3 names both merge tiers; §4 step 2 allows
  a stacked child lane; pre-merge check 4 merges the default branch in and never rebases a pushed
  branch; the ASK block gains an optional "Already tried" line. PR #42, issue #8,
  [D-8](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-8.md).
- The `pr-reviewer` verdict carries `HEAD`, `FINDINGS` and `ADVISORY`, so the `cycle-manager` and
  `pr-merge-loop` skills can use a relayed verdict. PR #44, issue #5,
  [D-5](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-5.md).
- The plugin installs from `plugins/hivion/`, so an install copies only the manifest and the
  skills: no `CLAUDE.md`, decision log or lint tooling, and no dependency install.
  PR #52, issue #48,
  [D-48](https://github.com/nikiteshjain19/agent-scaffold/blob/main/decisions.d/2026-10-05-48.md).

## [0.1.0] - 2026-10-04

Initial import of the workflow contract (`CLAUDE.md`), the house style (`STYLE.md`) and seven
skills, published as the `hivion` plugin.

[0.3.0]: https://github.com/nikiteshjain19/agent-scaffold/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nikiteshjain19/agent-scaffold/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nikiteshjain19/agent-scaffold/releases/tag/v0.1.0
