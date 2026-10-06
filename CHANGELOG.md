# Changelog

This file records what changed for a consumer of the `hivion` plugin, and `decisions.d/` records
why.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions
follow [Semantic Versioning](https://semver.org/). `PROJECT.md`, "Releases", states the version
scheme, the bump rule and the release steps. A release pull request adds each section.

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

[0.2.0]: https://github.com/nikiteshjain19/agent-scaffold/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nikiteshjain19/agent-scaffold/releases/tag/v0.1.0
