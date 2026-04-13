import type { Metadata } from "next";
import { Great_Vibes, Inter } from "next/font/google";

import { AuthSessionProvider } from "@/components/providers/session-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const logoScript = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-logo-script",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Aspexy Canvas",
  description: "Canvas de estrutura de horários para coordenação escolar.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${logoScript.variable}`} suppressHydrationWarning>
      <body className={[inter.variable, logoScript.variable, "font-sans"].join(" ")} suppressHydrationWarning>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
