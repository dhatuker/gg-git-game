import { msg, raw } from "../messages";
import { connectedRemote, failure, success } from "../state";
import type { Handler } from "../types";

export const remote: Handler = (state, args) => {
  const connected = connectedRemote(state);
  if (args.length === 0) {
    return success(state, connected ? [raw("origin")] : []);
  }
  if (args.length === 1 && args[0] === "-v") {
    return success(state, connected ? [raw(`origin\t${connected.url} (fetch)`), raw(`origin\t${connected.url} (push)`)] : []);
  }
  return failure(state, msg("remote.unsupported", { sub: args[0] }), `error: unknown subcommand: ${args[0]}`);
};
