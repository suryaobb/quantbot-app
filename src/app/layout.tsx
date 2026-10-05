import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Quantbot",
  description: "Quantbot trading system dashboard",
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/signals", label: "Signals" },
  { href: "/brain", label: "Brain" },
  { href: "/backtests", label: "Backtests" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/agent", label: "⚡ Agent" },
];

const BOTTOM_LINKS = [
  { href: "/", label: "Home", icon: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    </svg>
  )},
  { href: "/signals", label: "Signals", icon: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/>
      <path d="M6.3 6.3a8 8 0 000 11.4M17.7 6.3a8 8 0 010 11.4M3.5 3.5a13 13 0 000 17M20.5 3.5a13 13 0 010 17"/>
    </svg>
  )},
  { href: "/brain", label: "Brain", icon: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M9.5 2A2.5 2.5 0 007 4.5v.5A2.5 2.5 0 004.5 7.5C3.1 7.5 2 8.6 2 10s1.1 2.5 2.5 2.5H5a2.5 2.5 0 002.5 2.5v.5A2.5 2.5 0 009.5 18H10v2h4v-2h.5a2.5 2.5 0 002.5-2.5v-.5A2.5 2.5 0 0019.5 12.5H20A2.5 2.5 0 0022 10a2.5 2.5 0 00-2.5-2.5A2.5 2.5 0 0017 5v-.5A2.5 2.5 0 0014.5 2h-5z"/>
    </svg>
  )},
  { href: "/backtests", label: "Tests", icon: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/>
    </svg>
  )},
  { href: "/portfolio", label: "Portfolio", icon: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    </svg>
  )},
  { href: "/agent", label: "Agent", icon: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      <path d="M17 3l1.5 1.5M19 7h2M17 11l1.5-1.5" strokeLinecap="round"/>
    </svg>
  )},
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        {/* Top nav */}
        <nav className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#0D0D0D]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-6">
            <span className="text-base font-bold tracking-tight text-white">
              ⚡ Quantbot
            </span>
            {/* Desktop links — pill style */}
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-[#262626] bg-[#161616] p-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-4 py-1.5 text-sm nav-inactive transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {/* Live pulse */}
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--accent)" }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
              Live
            </span>
          </div>
        </nav>

        {/* Page content */}
        <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:pb-10">
          {children}
        </main>

        {/* Mobile bottom bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-[#1a1a1a] bg-[#0D0D0D]/95 backdrop-blur-md">
          <div className="flex items-center justify-around px-2 py-3">
            {BOTTOM_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-1 text-[#555] hover:text-white transition-colors"
              >
                {link.icon}
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </body>
    </html>
  );
}
