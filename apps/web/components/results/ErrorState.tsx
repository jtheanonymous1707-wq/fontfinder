// apps/web/components/results/ErrorState.tsx
"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  type: "not-found" | "failed";
  message?: string;
  errorCode?: string;
}

export function ErrorState({ type, message, errorCode }: Props) {
  const isNotFound = type === "not-found";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-fade-in">
      <div className="w-24 h-24 rounded-[32px] bg-red-50 flex items-center justify-center text-5xl">
        {isNotFound ? "🔍" : <AlertCircle className="w-12 h-12 text-red-500" />}
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-gray-900">
          {isNotFound ? "Job not found" : "Recognition failed"}
        </h2>
        <p className="text-gray-500 max-w-xs mx-auto">
          {message ?? (isNotFound
            ? "This scan may have expired or the link is invalid. Please try uploading again."
            : "Something went wrong processing your image. Our team has been notified."
          )}
        </p>
        
        {errorCode === "NO_FONTS_DETECTED" && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-sm border border-amber-100 mt-4">
            <p className="font-bold mb-1 flex items-center justify-center gap-1.5">
              💡 Pro Tip
            </p>
            Try a closer crop with clear, high-contrast text on a clean background.
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold
                     px-8 py-3.5 rounded-2xl transition-all shadow-lg
                     shadow-brand-100 hover:shadow-brand-200"
        >
          Try Another Image
        </Link>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200
                     text-gray-600 font-bold px-8 py-3.5 rounded-2xl
                     hover:bg-gray-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Page
        </button>
      </div>
    </div>
  );
}
