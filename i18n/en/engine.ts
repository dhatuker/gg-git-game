import type { EngineDict } from "../types";

export const en: EngineDict = {
  "parse.unclosedQuote": 'The quote is not closed. Make sure the message is wrapped in "...".',
  "parse.empty": "Type a command, for example `git status`.",
  "parse.notGit": "Commands must start with `git`, for example `git status`.",
  "parse.missingCommand": "Add a command name after `git`, for example `git status`.",

  "repo.notInitialized": "This folder is not a git repository yet. Run `git init` first.",
  "command.unknown": "The command `git {cmd}` is not available in this game.",
  "command.unknownSuggest": "The command `git {cmd}` is not available in this game. Did you mean `git {suggestion}`?",
  "state.dirty": "You have uncommitted changes. Commit them first (`git add`, then `git commit`) before switching or merging.",
  "untracked.switch":
    "These untracked files would be overwritten if you switch branches: {files}. Commit them first (`git add`, then `git commit`) or rename them.",
  "untracked.merge":
    "These untracked files would be overwritten by the merge: {files}. Commit them first (`git add`, then `git commit`) or rename them.",
  "files.invalidName": "File names may only contain letters, numbers, dots, underscores, or hyphens, without spaces.",
  "files.notConflicted": "The file `{file}` is not in conflict.",

  "init.done": "Created an empty git repository.",
  "init.already": "This repository already exists.",

  "status.onBranch": "On branch {branch}",
  "status.detached": "HEAD detached at {id}",
  "status.conflicts": "Unresolved conflicts:",
  "status.staged": "Changes to be committed:",
  "status.unstaged": "Changes not staged for commit:",
  "status.untracked": "Untracked files:",
  "status.clean": "Everything is already committed. There are no new changes to save.",

  "add.nothingSpecified": "Name the files to stage, for example `git add README.md` or `git add .`.",
  "add.missingFile": "The file `{file}` does not exist in the working directory.",
  "add.staged": "Staged: {files}",
  "add.conflictResolved": "Conflict in {files} marked as resolved.",
  "add.conflictsRemain": "Conflicts remain in: {files}.",
  "add.allConflictsResolved": 'All conflicts resolved. Continue with `git commit -m "..."` to create the merge commit.',
  "add.nothingNew": "No new changes to stage.",

  "commit.needMessage": 'A commit needs a message. Write it like this: `git commit -m "short message"`.',
  "commit.conflictsRemain": "Conflicts remain in: {files}. Fix their contents, then run `git add` for those files.",
  "commit.nothingStaged": "Nothing is staged yet. Run `git add` first.",
  "commit.mergeDone": "Merge complete.",

  "log.noCommits": "There are no commits to show yet. Make your first commit.",

  "branch.noCommits": "A branch can only be created after the first commit.",
  "branch.invalidName":
    "The branch name `{name}` is not valid. Use letters, numbers, dots, underscores, slashes, or hyphens (it must not start with a hyphen).",
  "branch.exists": "A branch named `{name}` already exists.",
  "branch.created": "Created branch `{name}` at commit {id}.",
  "branch.noneYet": "There are no branches yet because there are no commits.",
  "branch.deleteNeedsName": "Name the branch to delete: `git branch -d <name>`.",
  "branch.notFound": "Branch `{name}` was not found.",
  "branch.deleteCurrent": "Cannot delete branch `{name}` because you are on it. Switch to another branch first.",
  "branch.notMerged": "Branch `{name}` has commits that are not merged yet. Merge it first so those commits are not lost.",
  "branch.deleted": "Deleted branch `{name}`.",

  "switch.needTarget": "Name the branch to switch to, for example `git switch main`.",
  "switch.mergeInProgress": "Finish the merge in progress first.",
  "switch.alreadyOn": "Already on branch `{branch}`.",
  "switch.switched": "HEAD now points to branch `{branch}`.",
  "switch.detached": "HEAD now points directly at commit {id} (detached HEAD).",
  "switch.notFound": "Branch or commit `{target}` was not found.",

  "merge.needTarget": "Name the branch to merge, for example `git merge feature`.",
  "merge.inProgress": "A merge is still in progress. Resolve the conflicts, run `git add`, then `git commit`.",
  "merge.notFound": "Branch `{branch}` was not found.",
  "merge.noCommits": "Make your first commit before merging.",
  "merge.upToDate": "Branch `{branch}` is already included; there is nothing to merge.",
  "merge.fastForward": "Fast-forward: pointer `{branch}` moved ahead to {to}.",
  "merge.conflict": "Conflict! These files were changed differently on both branches: {files}.",
  "merge.conflictNext": "Choose the right content, then run `git add <file>` and `git commit`.",
  "merge.commitCreated": "Merge commit {id} created with two parents.",
};
