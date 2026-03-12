// apps/web/app/page.tsx
"use client";

import { ImageUploader } from "@/components/upload/ImageUploader";
import { HowItWorks } from "@/components/home/HowItWorks";
import { UseCaseGrid } from "@/components/home/UseCaseGrid";
import { SocialProof } from "@/components/home/SocialProof";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* 
        Background Checkered Pattern (from globals.css utility)
        and subtle gradients
      */}
      <div className="absolute inset-0 bg-checkered bg-[length:40px_40px] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px]
                      bg-brand-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Hero Content */}
      <section className="pt-20 pb-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700
                          px-4 py-1.5 rounded-full text-xs font-bold mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            AI-POWERED FONT IDENTIFICATION
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight animate-fade-up">
            Identify Any Font <br />
            <span className="text-gradient from-brand-500 to-violet-600">
              Instantly with AI.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-12
                        leading-relaxed animate-fade-up [animation-delay:200ms]">
            Upload an image of any design and our neural network will pinpoint
            the font from a library of millions. Get perfect pairings in seconds.
          </p>

          <div className="animate-fade-up [animation-delay:400ms]">
            <ImageUploader />
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <SocialProof />

      {/* Use Cases Grid */}
      <UseCaseGrid />

      {/* Process / Steps */}
      <HowItWorks />

      {/* Final CTA */}
      <section className="py-24 px-4 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-600/20 mix-blend-overlay" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            Ready to find your font?
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of designers using FontFinder to streamline their workflow.
            Completely free to use.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl
                       hover:bg-brand-50 transition-colors shadow-xl"
          >
            Start Identifying Now
          </button>
        </div>
      </section>
    </div>
  );
}
