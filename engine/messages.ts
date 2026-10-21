/**
 * Pesan engine berupa kunci + parameter, bukan kalimat jadi.
 * Kalimatnya ada di i18n/ (engine tidak tahu soal bahasa).
 */
export type MessageKey =
  // parse
  | "parse.unclosedQuote"
  | "parse.empty"
  | "parse.notGit"
  | "parse.missingCommand"
  // umum
  | "repo.notInitialized"
  | "command.unknown"
  | "command.unknownSuggest"
  | "flag.unsupported"
  | "flag.unsupportedNone"
  | "state.dirty"
  | "untracked.switch"
  | "untracked.merge"
  | "files.invalidName"
  | "files.notConflicted"
  // init
  | "init.done"
  | "init.already"
  // status
  | "status.onBranch"
  | "status.detached"
  | "status.conflicts"
  | "status.staged"
  | "status.unstaged"
  | "status.untracked"
  | "status.clean"
  | "status.rebaseInProgress"
  // add
  | "add.nothingSpecified"
  | "add.missingFile"
  | "add.staged"
  | "add.conflictResolved"
  | "add.conflictsRemain"
  | "add.allConflictsResolved"
  | "add.allConflictsResolvedRebase"
  | "rebase.inProgress"
  | "add.nothingNew"
  // commit
  | "commit.needMessage"
  | "commit.conflictsRemain"
  | "commit.nothingStaged"
  | "commit.mergeDone"
  // log
  | "log.noCommits"
  // branch
  | "branch.noCommits"
  | "branch.invalidName"
  | "branch.exists"
  | "branch.created"
  | "branch.noneYet"
  | "branch.deleteNeedsName"
  | "branch.notFound"
  | "branch.deleteCurrent"
  | "branch.notMerged"
  | "branch.deleted"
  | "branch.forceDeleted"
  // switch
  | "switch.needTarget"
  | "switch.mergeInProgress"
  | "switch.alreadyOn"
  | "switch.switched"
  | "switch.detached"
  | "switch.notFound"
  // merge
  | "merge.needTarget"
  | "merge.inProgress"
  | "merge.notFound"
  | "merge.noCommits"
  | "merge.upToDate"
  | "merge.fastForward"
  | "merge.conflict"
  | "merge.conflictNext"
  | "merge.commitCreated"
  | "merge.aborted"
  | "merge.nothingToAbort"
  // reset
  | "reset.noCommits"
  | "reset.badFlag"
  | "reset.soft"
  | "reset.mixed"
  | "reset.hard"
  | "reset.softStay"
  | "reset.mixedStay"
  | "reset.hardStay"
  // revert dan cherry-pick
  | "revert.needTarget"
  | "revert.noCommits"
  | "revert.isMerge"
  | "revert.conflict"
  | "revert.done"
  | "revert.empty"
  | "cherryPick.needTarget"
  | "cherryPick.noCommits"
  | "cherryPick.isMerge"
  | "cherryPick.conflict"
  | "cherryPick.done"
  | "cherryPick.empty"
  | "stash.unsupported"
  | "stash.nothing"
  | "stash.noCommits"
  | "stash.empty"
  | "stash.conflict"
  | "stash.saved"
  | "stash.popped"
  | "stash.noneYet"
  // rebase
  | "rebase.needTarget"
  | "rebase.notFound"
  | "rebase.notOnBranch"
  | "rebase.sameBranch"
  | "rebase.hasMerges"
  | "rebase.upToDate"
  | "rebase.fastForward"
  | "rebase.done"
  | "rebase.conflict"
  | "rebase.conflictNext"
  | "rebase.notInProgress"
  | "rebase.continueConflictsRemain"
  | "rebase.continueUnstaged"
  | "rebase.aborted"
  // clone dan remote
  | "clone.alreadyInit"
  | "clone.notFound"
  | "clone.needUrl"
  | "clone.badArgs"
  | "clone.done"
  | "remote.unsupported"
  | "remote.noRepo"
  // fetch dan push
  | "fetch.upToDate"
  | "fetch.done"
  | "pull.fetched"
  | "fetch.badFlag"
  | "push.onlyMain"
  | "push.noCommits"
  | "push.upToDate"
  | "push.done"
  | "push.rejectedFetchFirst"
  | "push.rejectedNonFastForward"
  | "push.badFlag"
  // pull dan pelacakan
  | "pull.onlyMain"
  | "pull.badFlag"
  | "pull.noCommits"
  | "status.trackingUpToDate"
  | "status.trackingAhead"
  | "status.trackingBehind"
  | "status.trackingDiverged"
  // revision
  | "revision.unknown"
  | "revision.ambiguous"
  | "revision.tooFar"
  | "revision.unsupported";

export type Params = Record<string, string | number>;

export interface Msg {
  key: MessageKey;
  params?: Params;
}

/** Baris output: pesan yang diterjemahkan, atau teks mentah (pesan asli git, nama file, baris log). */
export type OutputLine = Msg | { raw: string };

export function msg(key: MessageKey, params?: Params): Msg {
  return params ? { key, params } : { key };
}

export function raw(text: string): { raw: string } {
  return { raw: text };
}

export function isRaw(line: { raw: string } | { key: string }): line is { raw: string } {
  return "raw" in line;
}
