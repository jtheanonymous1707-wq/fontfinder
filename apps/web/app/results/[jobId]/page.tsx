// apps/web/app/results/[jobId]/page.tsx
import { ResultsView } from "@/components/results/ResultsView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Font Recognition Results" };

export default async function ResultsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Font Results</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Job #{jobId.slice(-8).toUpperCase()}
            </p>
          </div>
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700
                       font-semibold bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-colors"
          >
            + New scan
          </a>
        </div>

        <ResultsView jobId={jobId} />
      </div>
    </div>
  );
}
