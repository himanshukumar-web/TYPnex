import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LiquidGlassBackground from "@/components/ui/LiquidGlassBackground";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TYPnex - One place to talk, share and get things done.",
  description: "Next-generation customer communication, document typing and file exchange platform with liquid glass design.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans relative selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-200">
        <LiquidGlassBackground />
        {children}
      </body>
    </html>
  );
}
