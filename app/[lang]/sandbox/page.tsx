import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { translate } from "@/i18n/format";
import { isLang } from "@/i18n/negotiate";
import { LANGS } from "@/i18n/types";
import SandboxPage from "@/ui/SandboxPage";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/sandbox">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: `${translate(lang, "sandbox.title")} · ${translate(lang, "ui.appTitle")}` };
}

export default async function Sandbox({ params }: PageProps<"/[lang]/sandbox">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <SandboxPage lang={lang} />;
}
