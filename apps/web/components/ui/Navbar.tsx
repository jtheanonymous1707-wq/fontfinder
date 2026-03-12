// apps/web/components/ui/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const isHome   = pathname === "/";

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300
      ${isHome ? "bg-transparent" : "bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm"}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600
                          flex items-center justify-center shadow-md shadow-brand-200
                          group-hover:shadow-brand-300 transition-shadow">
            <span className="text-white text-sm">🔍</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-gray-900 text-sm">FontFinder</span>
            <span className="text-[10px] text-gray-400">by Creative Fabrica</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
          <Link href="/identify/logo"       className="hover:text-gray-900 transition-colors">Logos</Link>
          <Link href="/identify/poster"     className="hover:text-gray-900 transition-colors">Posters</Link>
          <Link href="/identify/screenshot" className="hover:text-gray-900 transition-colors">Screenshots</Link>
          <Link href="/identify/packaging"  className="hover:text-gray-900 transition-colors">Packaging</Link>
        </nav>

        {/* CTA */}
        <a
          href="https://www.creativefabrica.com/subscription/?utm_source=fontfinder&utm_medium=nav"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white
                     text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm
                     shadow-brand-200 hover:shadow-brand-300"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Get All Fonts
        </a>
      </div>
    </header>
  );
}
