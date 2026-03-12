// apps/web/components/home/HowItWorks.tsx
const STEPS = [
  {
    step: "01",
    icon: "📸",
    title: "Upload your image",
    desc: "Drop any PNG, JPG, or WEBP. Logos, posters, screenshots, book covers — anything with visible text.",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
  },
  {
    step: "02",
    icon: "⚙️",
    title: "We analyse the typography",
    desc: "Our CNN model scans for text regions, extracts typographic features, and matches against 180+ font classes.",
    color: "from-brand-500 to-violet-500",
    bg: "bg-brand-50",
  },
  {
    step: "03",
    icon: "✨",
    title: "Get fonts + perfect pairings",
    desc: "See the identified font, find it in CF's library, and discover 3 curated pairings that complement it.",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-4xl font-black text-gray-900">
            Three steps to any font
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={i} className={`${s.bg} rounded-3xl p-8 relative overflow-hidden group
                                     hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
              {/* Step number watermark */}
              <span className="absolute top-4 right-5 text-7xl font-black text-black/5
                               pointer-events-none select-none">
                {s.step}
              </span>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color}
                               flex items-center justify-center text-2xl mb-6 shadow-lg`}>
                {s.icon}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
