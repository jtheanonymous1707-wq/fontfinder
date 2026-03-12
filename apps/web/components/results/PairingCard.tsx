// apps/web/components/results/PairingCard.tsx
import { FontPairing } from "@/types";
import { ExternalLink, Sparkles } from "lucide-react";

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  heading: { label: "HEADING",  color: "text-blue-700",   bg: "bg-blue-50"   },
  body:    { label: "BODY",     color: "text-green-700",  bg: "bg-green-50"  },
  accent:  { label: "ACCENT",   color: "text-purple-700", bg: "bg-purple-50" },
};

export function PairingCard({
  pairing, index, jobId,
}: { pairing: FontPairing; index: number; jobId: string }) {
  const { font, pairingRole, reason, useCase } = pairing;
  const role = ROLE_BADGE[pairingRole] ?? ROLE_BADGE.accent;
  const UTM  = `utm_source=fontfinder&utm_medium=results&utm_campaign=pairing-${index + 1}`;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 hover:shadow-lg
                    transition-all duration-300 animate-fade-up group relative overflow-hidden"
         style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex gap-4">
        {font.previewImgUrl ? (
          <img
            src={font.previewImgUrl}
            alt={font.name}
            className="w-24 h-14 rounded-xl object-contain bg-gray-50 border border-gray-100
                       flex-shrink-0 self-start group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-24 h-14 rounded-xl border border-gray-100 bg-gray-50
                          flex items-center justify-center flex-shrink-0 self-start">
             <span className="text-gray-300 text-lg font-black">{font.name[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Role + free badge */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full ${role.bg} ${role.color}`}>
              {role.label} FONT
            </span>
            {font.isFree && (
              <span className="text-[10px] bg-green-500 text-white px-2 py-0.5
                               rounded-full font-black tracking-widest shadow-sm">FREE</span>
            )}
          </div>

          {/* Name */}
          <h3 className="text-xl font-black text-gray-900 group-hover:text-brand-600 transition-colors">
            {font.name}
          </h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-1.5 opacity-60">
            {[font.category, font.weight].map((t) => (
              <span key={t}
                className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full capitalize font-bold">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Why it works */}
      <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
        <div className="flex gap-2">
          <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-800">Why it works: </span>{reason}
          </p>
        </div>
        <p className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
          <span className="font-bold text-gray-500">BEST FOR: </span>{useCase}
        </p>
      </div>

      {/* Hover CTA */}
      <a
        href={`${font.cfUrl}?${UTM}`}
        target="_blank" rel="noopener noreferrer"
        className="mt-4 w-full flex items-center justify-center gap-2
                   bg-gray-900 text-white font-black
                   py-3 rounded-2xl text-sm transition-all
                   opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 shadow-xl"
      >
        Get this pairing
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
