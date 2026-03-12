// apps/web/components/results/ResultsView.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FontRecognitionJob } from "@/types";
import { FontResultCard } from "./FontResultCard";
import { CFMatchCard } from "./CFMatchCard";
import { PairingCard } from "./PairingCard";
import { ProcessingState } from "./ProcessingState";
import { ErrorState } from "./ErrorState";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { triggerCFMatch, triggerPairings } from "@/lib/jobs";

type Phase2 = "idle" | "matching" | "pairing" | "done" | "error";

export function ResultsView({ jobId }: { jobId: string }) {
  const [job, setJob]         = useState<FontRecognitionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase2, setPhase2]   = useState<Phase2>("idle");
  const started               = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "fontJobs", jobId),
      (snap) => { 
        if (snap.exists()) {
          setJob({ id: snap.id, ...snap.data() } as FontRecognitionJob);
        }
        setLoading(false); 
      },
      () => setLoading(false),
    );
    return unsub;
  }, [jobId]);

  useEffect(() => {
    if (job?.status === "completed" && !job.cfMatch && !started.current) {
      started.current = true;
      runPhase2();
    }
    if (job?.pairings) setPhase2("done");
  }, [job]);

  async function runPhase2() {
    try {
      setPhase2("matching");
      await triggerCFMatch(jobId);
      setPhase2("pairing");
      await triggerPairings(jobId);
      setPhase2("done");
    } catch {
      setPhase2("error");
    }
  }

  if (loading)                                            return <ResultsSkeleton />;
  if (!job)                                               return <ErrorState type="not-found" />;
  if (job.status === "queued" || job.status === "processing") return <ProcessingState />;
  if (job.status === "failed")                            return <ErrorState type="failed" message={job.error} errorCode={job.errorCode} />;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Uploaded image */}
      {job.imageDownloadUrl && (
        <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white
                        shadow-sm relative group">
          <img
            src={job.imageDownloadUrl}
            alt="Scanned design"
            className="w-full object-contain max-h-72 bg-checkered"
          />
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm
                          text-white text-xs px-3 py-1.5 rounded-full font-medium">
            {job.processingMs}ms · {job.detectedFonts?.slice(0, 5).length} detected font{(job.detectedFonts?.slice(0, 5).length ?? 0) !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Detected Fonts - Top 5 */}
      <Section emoji="🔍" title="Top Detected Fonts">
        {job.detectedFonts?.slice(0, 5).map((font, i) => (
          <FontResultCard
            key={i}
            font={font}
            isPrimary={font.confidence === Math.max(...(job.detectedFonts?.map(f => f.confidence) ?? [0]))}
            index={i}
          />
        ))}
        {(!job.detectedFonts || job.detectedFonts.length === 0) && (
          <p className="text-sm text-gray-400 italic py-4">
            No fonts detected. Try a clearer image.
          </p>
        )}
      </Section>

      {/* CF Match */}
      <Section emoji="🎯" title="Best Match in CF Library">
        {(phase2 === "matching" && !job.cfMatch) && <MatchingSkeleton />}
        {job.cfMatch && <CFMatchCard match={job.cfMatch} />}
        {phase2 === "error" && !job.cfMatch && (
          <p className="text-sm text-red-500 bg-red-50 p-4 rounded-2xl">
            Could not find a CF match. Try refreshing.
          </p>
        )}
      </Section>

      {/* Pairings */}
      {(job.cfMatch || phase2 === "pairing" || phase2 === "done") && (
        <Section emoji="✨" title="Recommended Pairings">
          {phase2 === "pairing" && !job.pairings && (
            <div className="space-y-4">
              <MatchingSkeleton />
              <MatchingSkeleton />
            </div>
          )}
          {job.pairings?.map((p, i) => (
            <PairingCard key={i} pairing={p} index={i} jobId={jobId} />
          ))}
        </Section>
      )}

      {/* Global CTA */}
      {phase2 === "done" && (
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700
                        p-8 text-center text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5  rounded-full" />

          <div className="relative space-y-4">
            <div className="text-4xl">✨</div>
            <h3 className="text-2xl font-black">Love these fonts?</h3>
            <p className="text-brand-200 text-sm max-w-sm mx-auto">
              Get unlimited access to all of them — plus 15M+ more fonts, graphics, and templates.
            </p>
            <a
              href="https://www.creativefabrica.com/subscription/?utm_source=fontfinder&utm_medium=results&utm_campaign=global-cta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold
                         px-8 py-3.5 rounded-2xl hover:bg-brand-50 transition-all
                         shadow-xl hover:-translate-y-0.5"
            >
              Start Free Trial →
            </a>
            <p className="text-xs text-brand-300">Cancel anytime · Commercial license included</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ emoji, title, children }: {
  emoji: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function MatchingSkeleton() {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <div className="bg-gray-200 h-16 w-24 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="bg-gray-200 h-3 w-20 rounded" />
          <div className="bg-gray-200 h-6 w-36 rounded" />
          <div className="flex gap-1.5">
            <div className="bg-gray-100 h-5 w-14 rounded-full" />
            <div className="bg-gray-100 h-5 w-10 rounded-full" />
          </div>
        </div>
      </div>
      <div className="bg-gray-100 h-10 w-full rounded-xl" />
    </div>
  );
}
