import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { buildNoFlashScript } from "@/lib/color-themes";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

const noFlashScript = buildNoFlashScript();

// No `title` here: every page sets its own tab title (`useDocumentTitle`), and a root
// metadata title is re-applied after hydration, over the title a Node page has just set.
export const metadata: Metadata = {
  description: "Local-first task management with a 2D grid",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
