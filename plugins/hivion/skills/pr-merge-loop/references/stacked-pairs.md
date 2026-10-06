# STACKED PAIRS — a child never merges before its parent

Read this file when the `pr-merge-loop` skill's SETUP step 2 finds a stacked pair or an orphaned
child. Every other section name below names a section of that skill's `SKILL.md`, and every item
keeps the number other documents cite.

A **stacked child** is an open PR whose base is another open PR's branch, and not BASE.
`CLAUDE.md` §3 permits that arrangement, and the `issue-loop` skill opens such a PR with
`--base <parent-branch>`. SETUP step 2 builds the pair list. This section says what the loop does
with each pair, and it binds both lanes.

**The base branch is the link between the two PRs, and the issue id is not.** Read the pair from
the PRs. This loop reads PRs before it reads tickets, so a ticket relation resolves too late.

1. **Never merge a stacked child while its parent is open.** This holds in either lane, on any
   verdict, and on any classification. A human approval never releases it either. Name the parent
   by number, say the child waits on it, and move to the next PR.
2. **Offer no merge option on a held child.** You may not perform that merge, so no wording of it
   is available to you (ASK BLOCK). Offer to hold the child until its parent merges.
3. **Merge a parent that carries an open child with a merge commit, and keep its branch.** Use the
   stacked-parent strategy CONFIG resolved. The project's ordinary merge strategy governs every
   other PR.

   **Say why, because the ordinary strategy breaks the child.** A squash writes a new commit to
   BASE, and deleting the branch retargets the child. The child's diff then re-includes the
   parent's changes and conflicts with them. A merge commit makes the parent's commits ancestors
   of BASE, so the child's diff stays its own changes alone.
4. **Retarget every child of that parent immediately after the parent merges.** Move the child's
   base to BASE: `gh pr edit <num> --base <BASE>`. Read the result of that call. Retarget an
   orphaned child that SETUP step 2 classified the same way. Never retarget a PR that SETUP step 2
   stopped: its base may be a live branch it targets on purpose.
5. **Never rebase a child, and never force-push one.** A retarget changes the PR's base, and it
   changes no commit. Item 3 is what makes that enough, so a stacked child needs no rebase and
   the no-force-push rule (private D-77) stands untouched.
6. **Re-run the project's checks on the retargeted child. Read the results yourself.** The child's
   diff is now measured against BASE, so the earlier run proves nothing about it.
7. **Re-run CLASSIFY for the child, on its current head SHA.** Its base moved, so the previous
   classification, any reviewer verdict and any human approval all lapse. This is the lapse
   CONFLICT declares for a resolution, applied to a base change.
8. **Re-present the child on that head SHA.** The escalate lane builds a fresh review card. The
   auto lane needs a fresh verdict from the independent reviewer.
9. **Delete the parent's branch once every child of it is retargeted.** Run `git fetch origin`
   first, so BASE includes the parent's merge. Then run
   `git merge-base --is-ancestor <branch tip> origin/<BASE>`. Delete the branch only when that
   check holds, so no commit is lost. Otherwise keep the branch, and report it. Report a branch you
   left behind, and name the child still holding it.
10. **Report every pair in plain English** (PLAIN-LANGUAGE RULE). Name the parent, name the child,
    and say what the child waits on.

**A child whose parent merged in an earlier run is still a child until it is retargeted.** Its base
names a branch that is merged, or gone. Retarget it under item 4, then work it as any other PR.

**Never merge to resolve a pair you cannot read.** A base branch you cannot match, and a child you
cannot retarget, each stop this loop for that PR. Report it, and move on.
