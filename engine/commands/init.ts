import { failure, success } from "../state";
import type { Handler } from "../types";

export const init: Handler = (state) => {
  if (state.initialized) {
    return failure(state, "Repositori ini sudah dibuat sebelumnya.", "Reinitialized existing Git repository");
  }
  return success(
    { ...state, initialized: true, head: { type: "branch", name: "main" } },
    "Repositori git kosong berhasil dibuat.\nInitialized empty Git repository in .git/",
    [{ type: "repo-dibuat" }],
  );
};
