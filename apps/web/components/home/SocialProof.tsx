// apps/web/components/home/SocialProof.tsx
const STATS = [
  { val: "15M+", label: "Fonts indexed" },
  { val: "180+", label: "Identifiable classes" },
  { val: "95%",  label: "Top-3 accuracy" },
  { val: "2s",   label: "Identification speed" },
];

export function SocialProof() {
  return (
    <section className="py-20 px-4 bg-white border-y border-gray-100">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="max-w-sm text-center md:text-left">
          <h2 className="text-3xl font-black text-gray-900 mb-4">
            Reliable font recognition for designers
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Stop wasting time manually browsing font libraries.
            Our advanced AI does the heavy lifting so you can focus on creating.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center md:items-start">
              <span className="text-3xl font-black text-brand-600 block mb-1">
                {s.val}
              </span>
              <span className="text-xs uppercase tracking-widest text-gray-400 font-bold whitespace-nowrap">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
