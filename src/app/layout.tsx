import type { Metadata } from "next";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Palomino Tennis Club – Tennis League",
  description: "Schedule, standings, and availability for your tennis league.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${sourceSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[--color-background] text-[--color-text]">
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
