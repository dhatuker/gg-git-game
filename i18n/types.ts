import type { MessageKey, Params } from "../engine/messages";

export type Lang = "id" | "en";
export const LANGS: readonly Lang[] = ["id", "en"];

/** Kunci teks milik UI (caption, reducer, komponen). */
export type UiKey =
  | "caption.repoCreated"
  | "caption.staged"
  | "caption.commitFirst"
  | "caption.commit"
  | "caption.branchCreated"
  | "caption.branchDeleted"
  | "caption.branchSwitched"
  | "caption.headDetached"
  | "caption.fastForward"
  | "caption.mergeCommit"
  | "caption.conflict"
  | "caption.conflictResolved"
  | "caption.resetSoft"
  | "caption.resetMixed"
  | "caption.resetHard"
  | "caption.resetSoftStay"
  | "caption.resetMixedStay"
  | "caption.resetHardStay"
  | "caption.revert"
  | "caption.cherryPick"
  | "caption.stashSaved"
  | "caption.stashRestored"
  | "caption.rebaseCopied"
  | "caption.rebaseDone"
  | "caption.rebaseAborted"
  | "caption.clone"
  | "caption.fetch"
  | "caption.push"
  | "caption.pushRejectedFetchFirst"
  | "caption.pushRejectedNonFastForward"
  | "caption.readOnly"
  | "game.notAllowed"
  | "ui.appTitle"
  | "ui.appDescription"
  | "ui.langGroup"
  | "ui.levelOf"
  | "ui.hints"
  | "ui.hintN"
  | "ui.hintButton"
  | "ui.hintsAllShown"
  | "ui.nudge"
  | "ui.levelDone"
  | "ui.allDone"
  | "ui.nextLevel"
  | "ui.resetLevel"
  | "ui.mapLabel"
  | "ui.mapStop"
  | "ui.mapStopDone"
  | "ui.mapStopLocked"
  | "ui.terminalEmpty"
  | "ui.terminalInput"
  | "ui.editorTitle"
  | "ui.editorConflict"
  | "ui.editorRebaseNote"
  | "ui.useOurs"
  | "ui.useTheirs"
  | "ui.saveChanges"
  | "ui.fileContent"
  | "ui.newFileLabel"
  | "ui.newFilePlaceholder"
  | "ui.createFile"
  | "ui.graphTitle"
  | "ui.skipAnimation"
  | "ui.graphNoRepo"
  | "ui.graphNoCommits"
  | "ui.areasLabel"
  | "ui.areaWorking"
  | "ui.areaWorkingDesc"
  | "ui.areaWorkingEmpty"
  | "ui.areaStaging"
  | "ui.areaStagingDesc"
  | "ui.areaStagingEmpty"
  | "ui.areaStash"
  | "ui.areaStashDesc"
  | "ui.areaStashEmpty"
  | "ui.areaRemote"
  | "ui.areaRemoteDesc"
  | "ui.areaRemoteEmpty"
  | "ui.remoteAhead"
  | "ui.remoteBehind"
  | "ui.remoteSynced"
  | "ui.areaRepo"
  | "ui.areaRepoDesc"
  | "ui.areaRepoEmpty"
  | "ui.noteNew"
  | "ui.noteChanged"
  | "ui.noteConflict"
  | "ui.orphanNode";

export type DictKey = MessageKey | UiKey;

/** Pesan yang bisa diterjemahkan: dari engine atau dari UI. */
export interface TMsg {
  key: DictKey;
  params?: Params;
}

export type TLine = TMsg | { raw: string };

export type EngineDict = Record<MessageKey, string>;
export type UiDict = Record<UiKey, string>;
export type Dict = Record<DictKey, string>;

export type { Params };
