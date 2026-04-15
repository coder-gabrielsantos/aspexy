import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import { AuthSessionProvider } from "@/components/providers/session-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const logoFont = Outfit({
  subsets: ["latin"],
  variable: "--font-logo",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Aspexy",
  description: "Canvas de estrutura de horários para coordenação escolar.",
  icons: {
    icon: [{ url: "/favicon.ico" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${logoFont.variable}`} suppressHydrationWarning>
      <body className={[inter.variable, logoFont.variable, "font-sans"].join(" ")} suppressHydrationWarning>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
