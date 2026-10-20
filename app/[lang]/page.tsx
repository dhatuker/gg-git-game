import { notFound } from "next/navigation";
import { LanguageProvider } from "@/ui/LanguageProvider";
import { HomePage } from "@/ui/HomePage";
import { isLang } from "@/i18n/negotiate";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <LanguageProvider lang={lang}>
      <HomePage />
    </LanguageProvider>
  );
}
