import { LANGS, type Lang } from "../i18n/types";
import { useLang } from "./LanguageProvider";

/** Nama bahasa dalam bahasanya sendiri, agar pembaca layar tidak mengeja "I D" / "E N". */
const NATIVE_NAME = { id: "Bahasa Indonesia", en: "English" } as const;

/** `onSwitch` dipanggil saat pemain memilih bahasa lain (bukan bahasa yang sedang aktif). */
export function LanguageToggle({ onSwitch }: { onSwitch: (lang: Lang) => void }) {
  const { lang, t } = useLang();
  return (
    <div className="gg-lang" role="group" aria-label={t("ui.langGroup")}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className="gg-lang-btn"
          lang={l}
          aria-label={NATIVE_NAME[l]}
          aria-pressed={l === lang}
          onClick={() => l !== lang && onSwitch(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
