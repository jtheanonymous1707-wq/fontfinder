// apps/web/components/results/FontResultCard.tsx
"use client";

import { DetectedFont } from "@/types";
import { ExternalLink, Star } from "lucide-react";
import { useEffect, useState } from "react";

const UTM = "utm_source=fontfinder&utm_medium=results&utm_campaign=detected";

const CONFIDENCE_CONFIG = (c: number) =>
  c >= 0.8 ? { label: "High confidence",   color: "text-green-600",  bg: "bg-green-100"  } :
  c >= 0.5 ? { label: "Medium confidence", color: "text-amber-600",  bg: "bg-amber-100"  } :
             { label: "Low confidence",    color: "text-red-500",    bg: "bg-red-100"    };

function LiveFontPreview({ fontName, isPrimary }: { fontName: string; isPrimary: boolean }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!fontName) return;
    const encoded = encodeURIComponent(fontName);
    const linkId = `gf-${encoded}`;
    if (document.getElementById(linkId)) { setLoaded(true); return; }
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`;
    link.onload = () => setLoaded(true);
    document.head.appendChild(link);
  }, [fontName]);

  return (
    <div className={`w-full rounded-2xl flex items-center justify-center overflow-hidden px-6 py-5 mb-4
                     ${isPrimary ? "bg-brand-50" : "bg-gray-50"}`}>
      {loaded ? (
        <p
          className="text-2xl leading-snug text-center text-gray-800 select-none"
          style={{ fontFamily: `'${fontName}', serif` }}
        >
          ABCDEFGHIJKLM
          <br />
          NOPQRSTUVWXYZ
        </p>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <span className="w-full h-6 rounded-lg bg-gray-200 animate-pulse block" />
          <span className="w-full h-6 rounded-lg bg-gray-200 animate-pulse block" />
        </div>
      )}
    </div>
  );
}

export function FontResultCard({
  font, isPrimary, index,
}: { font: DetectedFont; isPrimary: boolean; index: number }) {
  const pct  = Math.round(font.confidence * 100);
  const conf = CONFIDENCE_CONFIG(font.confidence);

  return (
    <div className={`rounded-3xl border bg-white p-5 transition-all duration-300
                     hover:shadow-md animate-fade-up
                     ${isPrimary
                       ? "border-brand-200 shadow-sm shadow-brand-100"
                       : "border-gray-100"}`}
         style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top: full-width font sample or stored preview */}
      {font.previewImgUrl ? (
        <img
          src={font.previewImgUrl}
          alt={font.identifiedName ?? "Font"}
          className="w-full h-24 object-contain rounded-2xl bg-gray-50 mb-4"
        />
      ) : (
        <LiveFontPreview fontName={font.identifiedName ?? ""} isPrimary={isPrimary} />
      )}

      {/* Bottom: metadata row */}
      <div className="space-y-2">
        {/* Name + confidence */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Role + badges */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                {font.role}
              </span>
              {isPrimary && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-brand-100
                                 text-brand-700 px-2 py-0.5 rounded-full font-bold">
                  <Star className="w-2.5 h-2.5 fill-current" /> PRIMARY
                </span>
              )}
              {font.inCFLibrary && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5
                                 rounded-full font-bold uppercase">
                  IN CF LIBRARY
                </span>
              )}
            </div>

            {/* Font name */}
            <h3 className="text-xl font-black text-gray-900 truncate leading-tight">
              {font.identifiedName ?? "Unidentified font"}
            </h3>
          </div>

          {/* Confidence badge */}
          <div className={`${conf.bg} ${conf.color} text-xs font-bold px-2.5 py-1.5
                           rounded-xl flex-shrink-0 text-center min-w-[54px]`}>
            <div className="text-sm font-black leading-none">{pct}%</div>
            <div className="text-[8px] uppercase tracking-wider mt-0.5 opacity-80">match</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {[font.category, font.weight, ...(font.style === "italic" ? ["italic"] : [])].map((t) => (
            <span key={t}
              className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize font-medium">
              {t}
            </span>
          ))}
          {font.moodTags.slice(0, 3).map((t) => (
            <span key={t}
              className="text-[11px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">
              {t}
            </span>
          ))}
        </div>

        {/* Notable features */}
        {font.notableFeatures && (
          <p className="text-[11px] text-gray-400 leading-relaxed italic border-l-2 border-gray-100 pl-2">
            {font.notableFeatures}
          </p>
        )}
      </div>

      {/* CTA */}
      {font.cfUrl && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <a
            href={`${font.cfUrl}?${UTM}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold
                       text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-widest"
          >
            View on Creative Fabrica
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
