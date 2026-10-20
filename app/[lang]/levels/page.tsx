import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { translate } from "@/i18n/format";
import { isLang } from "@/i18n/negotiate";
import { LANGS } from "@/i18n/types";
import { LanguageProvider } from "@/ui/LanguageProvider";
import { LevelSelect } from "@/ui/LevelSelect";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/levels">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: `${translate(lang, "levels.title")} · ${translate(lang, "ui.appTitle")}` };
}

export default async function Levels({ params }: PageProps<"/[lang]/levels">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <LanguageProvider lang={lang}>
      <LevelSelect />
    </LanguageProvider>
  );
}
