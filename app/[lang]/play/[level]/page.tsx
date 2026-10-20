import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { translate } from "@/i18n/format";
import { isLang } from "@/i18n/negotiate";
import { LANGS } from "@/i18n/types";
import { LEVELS } from "@/levels";
import Game from "@/ui/Game";

/** Semua level di kedua bahasa diprerender saat build. */
export function generateStaticParams() {
  return LANGS.flatMap((lang) => LEVELS.map((l) => ({ lang, level: String(l.id) })));
}

function indexOf(level: string): number {
  return /^\d+$/.test(level) ? LEVELS.findIndex((l) => l.id === Number(level)) : -1;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/play/[level]">): Promise<Metadata> {
  const { lang, level } = await params;
  const i = indexOf(level);
  if (!isLang(lang) || i < 0) return {};
  return { title: `${translate(lang, "play.levelTitle", { n: LEVELS[i].id, title: LEVELS[i].title[lang] })} · ${translate(lang, "ui.appTitle")}` };
}

export default async function Play({ params }: PageProps<"/[lang]/play/[level]">) {
  const { lang, level } = await params;
  const i = indexOf(level);
  if (!isLang(lang) || i < 0) notFound();
  return <Game lang={lang} levelIndex={i} />;
}
