// apps/web/components/results/CFMatchCard.tsx
import { CFMatch } from "@/types";
import { ExternalLink, Zap } from "lucide-react";

const UTM = "utm_source=fontfinder&utm_medium=results&utm_campaign=cf-match";

export function CFMatchCard({ match }: { match: CFMatch }) {
  const { font, matchType, similarity } = match;

  return (
    <div className="rounded-[32px] border-2 border-amber-200 bg-gradient-to-br
                    from-amber-50 to-orange-50 p-6 animate-fade-up shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shadow-md">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 leading-none mb-0.5">
            {matchType === "exact" ? "EXACT MATCH FOUND" : "CLOSEST CF MATCH"}
          </p>
          {similarity !== undefined && (
            <p className="text-xs text-amber-600 font-medium">{Math.round(similarity * 100)}% similarity score</p>
          )}
        </div>
        {font.isFree && (
          <span className="ml-auto text-[10px] bg-green-500 text-white px-2.5 py-1
                           rounded-full font-black uppercase tracking-widest shadow-sm">
            FREE
          </span>
        )}
      </div>

      {/* Font info */}
      <div className="flex gap-4 mb-6">
        {font.previewImgUrl ? (
          <img
            src={font.previewImgUrl}
            alt={font.name}
            className="w-32 h-18 rounded-2xl object-contain bg-white border border-amber-100
                       flex-shrink-0 shadow-inner"
          />
        ) : (
          <div className="w-32 h-18 rounded-2xl border border-amber-100 bg-white
                          flex items-center justify-center flex-shrink-0">
             <span className="text-amber-200 text-xl font-black italic">Aa</span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-2xl font-black text-gray-900 leading-tight">{font.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[font.category, font.weight, ...font.moodTags.slice(0, 2)].map((t) => (
              <span key={t}
                className="text-[10px] bg-white/50 text-amber-800 px-2.5 py-0.5 rounded-full capitalize font-bold border border-amber-100">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2">
        <a
          href={`${font.cfUrl}?${UTM}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-amber-500
                     hover:bg-amber-600 text-white font-black py-4 px-4
                     rounded-2xl transition-all text-sm shadow-xl shadow-amber-200/50 hover:-translate-y-0.5"
        >
          Download on Creative Fabrica
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={`https://www.creativefabrica.com/subscription/?${UTM}&content=match-trial`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-white/50 border-2 border-amber-200
                     text-amber-700 hover:bg-white/80 font-bold py-3.5 px-4
                     rounded-2xl transition-all text-sm"
        >
          🔓 Unlock All 15M+ Fonts
        </a>
      </div>
    </div>
  );
}
