import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { LearnerProvider } from "@/components/LearnerProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillPath — Learning path planner",
  description:
    "Plan your route from what you know today to the skill you want next, powered by a CognoDB graph.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
        <LearnerProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
            SkillPath — a CognoDB graph database demo
          </footer>
        </LearnerProvider>
      </body>
    </html>
  );
}
