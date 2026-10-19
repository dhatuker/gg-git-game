import { notFound } from "next/navigation";
import { isLang } from "@/i18n/negotiate";
import Game from "@/ui/Game";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <Game lang={lang} />;
}
