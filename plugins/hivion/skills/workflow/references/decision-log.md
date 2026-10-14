# Decision log

The decision log lives in `decisions.d/`.

An append-only log of every decision that shapes the project: pricing, architecture, naming, scope
cuts, tool choices, policy changes. **One decision per file**, `decisions.d/<YYYY-MM-DD>-<id>.md`,
written on the branch of the ticket that produced it.

**Read the log by reading the directory.** Filename order is chronological, so the files in order
are the log. Assemble them into one document however the project likes. The format needs no
particular reader, and a project that wants a tool writes its own.

**Never commit an assembled view.** A committed assembled file reintroduces the collision the
directory removes. Regenerating it after a merge would also be a direct commit to the default
branch.

- **When to log:** any time the user makes or changes a decision in conversation, and any time
  an agent makes a judgment call the user delegated. If it would change how a future ticket is
  implemented, it's a decision — log it.
- **The id comes from the issue, not from a counter.** A decision arising from issue `#N` is
  `D-N`, in `decisions.d/<date>-N.md`. A second decision from one issue is suffixed — `D-Nb`.
  **Never take "the next free number":** two branches guessing simultaneously either collide on
  the filename, or — worse — pick different filenames while both claiming the same id in the
  heading, which git merges silently into two decisions sharing one id. The tracker assigned the
  issue number before either branch existed, so an issue-derived id cannot collide.
  **Two entries must never claim one id.** That is an obligation on the project, not on a tool.
  Enforce it however the project likes — refusing to assemble a log that holds a duplicate id is
  one way.
- **Legacy ids stay as they are.** A log may hold entries a counter numbered before this rule. Those
  entries keep their ids. Never renumber one: the decision log is append-only. Such a log's id
  vocabulary is permanently mixed — sequential for the early entries, issue-derived after. **That is
  correct, not a defect to tidy up.**
- **A citation names its log.** An id alone does not say which log holds the entry, and two logs
  can each hold an entry with the same id. Write every citation in one of three forms:
  - **`D-N`** — an entry in the reading repository's own `decisions.d/`.
  - **`scaffold D-N`** — an entry in the scaffold's public log. That log is the `decisions.d/` of
    the repository that publishes the `workflow` skill and the other skills.
  - **`private D-N`** — an entry in the private log of the repository the scaffold grew in. No
    reader outside that repository can open it.

  The `workflow` skill, its reference files and every other skill travel to every consuming
  repository. Never write a bare
  `D-N` in them. A bare id there names the consumer's own entry instead. In the scaffold's own
  repository, `D-N` and `scaffold D-N` name the same log. **A marked citation is provenance
  only.** Make the sentence around it state everything the reader needs. Never make an instruction
  depend on opening the entry.
- **Format per entry** — the file opens with a level-1 heading so it is a valid standalone
  document. An assembler that joins entries into one document demotes that heading to level 2.
  Each `<…>` below is a placeholder:

  ```markdown
  # D-<N> — <YYYY-MM-DD> — <short decision title>

  - **Decision:** what was decided, in one or two sentences.
  - **Context:** why (the alternative considered, the trigger).
  - **Supersedes:** D-<S> (if applicable — and add "Superseded by D-<N>" to D-<S>; never delete
    entries)
  - **Corrects:** D-<C> (if applicable — and add "Corrected by D-<N>" to D-<C>; never delete
    entries)
  - **Affects:** areas/tickets/PRs this touches (e.g. pricing pages, ABC-45, PR #12)
  ```

- **Two relations, and the test that picks one.** Ask whether the earlier decision still binds.
  **`Supersedes`** — the earlier decision, or the named part of it, is **off**. A reader must stop
  applying it. **`Corrects`** — the earlier decision **stays in force**, and this entry changes its
  scope, its mechanism, or how it was recorded. A reader must read both entries.
  **Write `Supersedes` when you cannot tell.** It is the louder claim, and it sends the reader to
  the newer entry. A wrong `Corrected by` leaves a reader applying a rule that is off, which is the
  worse of the two failures.

- **Append-only.** Reversed decisions are superseded by a new entry, never edited away — the
  history is the point.
- **Either relation still edits the earlier entry's file, and that is left conflicting on
  purpose.** Two branches marking one decision superseded or corrected is a genuine semantic
  disagreement about what the project has decided — a human should resolve it. The
  one-file-per-decision layout removes the *mechanical* collision (two unrelated decisions fighting
  over one file); it deliberately does not remove this one.
  **Name the earlier entry's file in the issue's declared file footprint** whenever you write
  either relation. One entry, private D-70, could not write its back-reference, because that
  file sat outside its footprint.
- **Who reads it:** every agent, at two moments — before implementing a ticket
  ("Picking up a ticket", step 4) and during pre-merge review ("Merge gate", pre-merge check 2).
- **Sweep on change:** when a new decision lands, briefly scan open tickets and open PRs for
  ones it invalidates; comment on each affected item naming the decision ID.
