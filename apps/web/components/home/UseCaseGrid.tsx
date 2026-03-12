// apps/web/components/home/UseCaseGrid.tsx
import Link from "next/link";

const USE_CASES = [
  { emoji: "🏷️", label: "Logo fonts",       href: "/identify/logo",       color: "bg-rose-50   border-rose-100   hover:border-rose-300" },
  { emoji: "🎨", label: "Poster fonts",     href: "/identify/poster",     color: "bg-orange-50 border-orange-100 hover:border-orange-300" },
  { emoji: "📱", label: "App screenshots",  href: "/identify/screenshot", color: "bg-blue-50   border-blue-100   hover:border-blue-300" },
  { emoji: "📖", label: "Book covers",      href: "/identify/book-cover", color: "bg-green-50  border-green-100  hover:border-green-300" },
  { emoji: "📦", label: "Packaging",        href: "/identify/packaging",  color: "bg-yellow-50 border-yellow-100 hover:border-yellow-300" },
  { emoji: "💌", label: "Wedding cards",    href: "/identify/wedding",    color: "bg-pink-50   border-pink-100   hover:border-pink-300" },
  { emoji: "📸", label: "Instagram posts",  href: "/identify/instagram",  color: "bg-purple-50 border-purple-100 hover:border-purple-300" },
  { emoji: "🎬", label: "Video thumbnails", href: "/identify/thumbnail",  color: "bg-cyan-50   border-cyan-100   hover:border-cyan-300" },
];

export function UseCaseGrid() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">
            Works on anything
          </p>
          <h2 className="text-4xl font-black text-gray-900 mb-3">
            Identify fonts anywhere
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Whatever you're designing or inspired by — we can find the font.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {USE_CASES.map((uc) => (
            <Link
              key={uc.href}
              href={uc.href}
              className={`${uc.color} border-2 rounded-2xl p-5 flex flex-col
                          items-center gap-3 transition-all duration-200
                          hover:-translate-y-1 hover:shadow-md group`}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                {uc.emoji}
              </span>
              <span className="text-sm font-semibold text-gray-700 text-center leading-tight">
                {uc.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
