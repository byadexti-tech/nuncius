import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Nuncius — Conversas que conectam",
    template: "%s | Nuncius",
  },
  description:
    "Crie widgets de chat e conecte seus assistentes aos workflows do n8n.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        <ThemeProvider><I18nProvider>{children}</I18nProvider></ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
