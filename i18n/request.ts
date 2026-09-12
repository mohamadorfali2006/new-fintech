import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = (locale ?? defaultLocale) as Locale;
  if (!locales.includes(resolvedLocale)) notFound();

  const messages = (await import(`../messages/${resolvedLocale}.json`)).default;

  return {
    locale: resolvedLocale,
    messages,
    timeZone: "UTC",
  };
});
