import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource/overpass/400.css";
import "@fontsource/overpass/600.css";
import "@fontsource/overpass/700.css";
import "@fontsource/overpass/800.css";
import "@fontsource/overpass-mono/400.css";
import "@fontsource/overpass-mono/600.css";
import "../globals.css";
import { translate } from "@/i18n/format";
import { isLang } from "@/i18n/negotiate";
import { LANGS } from "@/i18n/types";

/** `/id` dan `/en` diprerender saat build. */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: translate(lang, "ui.appTitle"), description: translate(lang, "ui.appDescription") };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
