# The stacked lane — the `issue-loop` skill's one exception to the blocker hold

Read this file when the trigger in §1 step 5 fires: a candidate's `## Dependencies` carries a
`Stack on:` line. Every section number below names a section of the `issue-loop` skill.

## The request

A child issue may run beside the parent issue whose code it needs. The exception is narrow, and
it is opt-in. The child asks for it with this line in its `## Dependencies`:

```text
Stack on: #<parent issue id>
```

Never stack a child that did not ask. `CLAUDE.md` §3 permits a stacked PR, and this lane
implements it for one parent-child pair alone.

## The dispatch conditions

**The parent is an issue whose PR is open and green, whether this run or an earlier run opened
it.** A parent dispatched in the same dispatch wave has no PR yet. Its branch holds nothing for
the child to build on. Under the `cycle-manager` skill each run dispatches one wave (#66), so the
parent always comes from an earlier run.

Dispatch a child beside its parent only when **every** one of these five conditions holds:

1. The child's `Stack on:` line names the parent, and the parent is the child's only open blocker.
2. The parent's PR is open and green. The lane re-reads that signal immediately before the child
   opens its PR (§4 step 9). A parent green at dispatch can be red an hour later.
3. The child's PR opens with `--base <parent-branch>` (§4 step 9).
4. The child's PR body names its base branch. The body states that the child must not merge
   before the parent (§4 step 9).
5. `PROJECT.md`'s merge strategy merges a stacked parent with a merge commit, and keeps its
   branch while a child is based on it. It may do that as its ordinary strategy or as a declared
   exception. Without it there is no stacked lane, and the child waits like any blocked issue.

**Hold back a child that fails any one condition.** §1 step 5 holds it back as blocked by its
parent, with the reason `blocked by #N`. The exception opens no other route past a blocker.

**The lane is one level deep.** A child of a child stays held back.

**The reservation set still binds the child.** The parent's PR is in the reservation set (§1
step 8), so the child's footprint must stay disjoint from the parent's paths. A child that needs
the parent's *files* is not the case this lane covers.

## Dispatch

- **The start point.** The coordinator cuts the child's worktree from the parent's branch. Run
  `git fetch origin`, then `git worktree add -b <branch> <path> origin/<parent branch>` (§6
  item 2). That start point belongs to a stacked child alone, and to no other lane.
- **The brief.** The coordinator passes this file to the child's lane, beside everything §6 item 3
  passes.

## Working the child

- **The branch (§4 step 2).** The child works on a branch cut from its parent's branch. Every
  other lane works on a branch cut from the default branch.
- **The sync (§4 step 7).** The child syncs with its parent's branch, not with the default branch.
  Fetch first. Merge the parent's branch into the child's branch. Re-run the pre-PR gate after
  that sync. The child syncs with the default branch once the parent merges and the merge flow
  retargets the child.
- **The PR (§4 step 9).** Read the parent's PR checks again immediately before you open the
  child's PR. Hold the child back whenever that signal is not green: return the lane as bounced,
  and the coordinator releases the claim (§5). Otherwise open the PR with `--base <parent-branch>`.
- **The body (§4 step 9).** Say the stack in the convention `CLAUDE.md` §3 sets. Write "stacked
  on #NN", naming the parent. Name the base branch as well. State that this PR must not merge
  before the parent.

**A stacked child never needs a rebase, so it never needs a force-push.** The merge flow merges a
parent that carries an open child with a merge commit, and keeps its branch (the `pr-merge-loop`
skill's STACKED PAIRS item 3). It does so where `PROJECT.md`'s merge strategy provides it (§1
step 5, condition 5 above). The parent's commits then become ancestors of the default branch, so
the child's diff is its own changes alone. Moving the child's base is a base change on the PR,
never a rebase of the child's commits. So the no-rebase-after-push rule in §4 step 7 and the
no-force-push rule both stand untouched.

## The Stack block — END OF RUN

**The run report prints every stack this run dispatched.** Print one row per parent-child pair:

| Parent | Child | Child's base branch | Retarget owed |
| --- | --- | --- | --- |

Fill `Retarget owed` with what the pair still owes. Every open pair owes one move: the child's base
goes to the default branch once the parent merges. The merge flow performs that move (the
`pr-merge-loop` skill's STACKED PAIRS phase).

The hard rule "Never let a stacked child merge before its parent" stays in §7, where every run
reads it.
