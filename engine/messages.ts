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
  // add
  | "add.nothingSpecified"
  | "add.missingFile"
  | "add.staged"
  | "add.conflictResolved"
  | "add.conflictsRemain"
  | "add.allConflictsResolved"
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
  | "merge.commitCreated";

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
