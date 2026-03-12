// apps/web/components/ui/Footer.tsx
import Link from "next/link";

const LINKS = {
  "Use cases": [
    { label: "Logo fonts",     href: "/identify/logo" },
    { label: "Poster fonts",   href: "/identify/poster" },
    { label: "Screenshot",     href: "/identify/screenshot" },
    { label: "Book covers",    href: "/identify/book-cover" },
    { label: "Packaging",      href: "/identify/packaging" },
    { label: "Wedding cards",  href: "/identify/wedding" },
  ],
  "Creative Fabrica": [
    { label: "Font library",   href: "https://www.creativefabrica.com/fonts/" },
    { label: "Subscription",   href: "https://www.creativefabrica.com/subscription/" },
    { label: "Free fonts",     href: "https://www.creativefabrica.com/freebies/" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-xs">🔍</span>
              </div>
              <span className="font-bold text-gray-900">FontFinder</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Upload any design and instantly identify the fonts used.
              Powered by machine learning, backed by Creative Fabrica's 15M+ font library.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {group}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-brand-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row
                        items-center justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 Creative Fabrica. FontFinder is a free tool.</p>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
