import { en as enEngine } from "./en/engine";
import { en as enUi } from "./en/ui";
import { id as idEngine } from "./id/engine";
import { id as idUi } from "./id/ui";
import type { Dict, Lang } from "./types";

export const DICTS: Record<Lang, Dict> = {
  id: { ...idEngine, ...idUi },
  en: { ...enEngine, ...enUi },
};
