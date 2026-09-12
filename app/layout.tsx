import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "NewFinTech — Personal Finance Intelligence",
    template: "%s | NewFinTech",
  },
  description:
    "Intelligent personal finance & expense analytics platform. Track spending, set budgets, and get AI-powered financial insights.",
  keywords: ["finance", "budget", "expense tracker", "personal finance", "fintech"],
  authors: [{ name: "NewFinTech" }],
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${inter.variable} font-sans`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
