<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Build a beautiful front end ui for user to able to use it

Here is the complete, polished UI — every page and component fully styled with Tailwind.

***

## Step 1 — Install UI Dependencies

```bash
cd apps/web
npm install framer-motion lucide-react
npm install @tailwindcss/typography
```


## Step 2 — `tailwind.config.ts`

```typescript
// apps/web/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Cal Sans", "Inter", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
      },
      animation: {
        "fade-in":      "fadeIn 0.4s ease-out",
        "fade-up":      "fadeUp 0.5s ease-out",
        "slide-in":     "slideIn 0.3s ease-out",
        "pulse-slow":   "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow":    "spin 3s linear infinite",
        "shimmer":      "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" },                    to: { opacity: "1" } },
        fadeUp:  { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideIn: { from: { opacity: "0", transform: "translateX(-12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
        "hero-mesh":
          "radial-gradient(at 40% 20%, hsla(270,80%,95%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(248,80%,95%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(280,70%,96%,1) 0px, transparent 50%)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};

export default config;
```


## Step 3 — `globals.css`

```css
/* apps/web/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap");

@layer base {
  :root {
    --brand: 263 70% 50%;
  }

  * {
    @apply border-border;
  }

  html {
    @apply scroll-smooth antialiased;
  }

  body {
    @apply bg-white text-gray-900 font-sans;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  /* Shimmer skeleton */
  .skeleton {
    @apply bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-lg;
  }

  /* Glass card */
  .glass {
    @apply bg-white/70 backdrop-blur-md border border-white/50;
  }

  /* Gradient text */
  .text-gradient {
    @apply bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent;
  }
}
```


## Step 4 — Root Layout (Redesigned)

```tsx
// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FirebaseProvider } from "@/components/providers/FirebaseProvider";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FontFinder — Identify Any Font Instantly",
    template: "%s | FontFinder by Creative Fabrica",
  },
  description:
    "Upload any design, poster, or screenshot and instantly identify the fonts. Find perfect CF pairings from 15M+ fonts.",
  keywords: ["font identifier", "what font is this", "font finder", "font recognition", "identify font from image"],
  openGraph: {
    type: "website",
    siteName: "FontFinder by Creative Fabrica",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-white">
        <FirebaseProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </FirebaseProvider>
      </body>
    </html>
  );
}
```


## Step 5 — Navbar + Footer

```tsx
// apps/web/components/ui/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const isHome   = pathname === "/";

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300
      ${isHome ? "bg-transparent" : "bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm"}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600
                          flex items-center justify-center shadow-md shadow-brand-200
                          group-hover:shadow-brand-300 transition-shadow">
            <span className="text-white text-sm">🔍</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-gray-900 text-sm">FontFinder</span>
            <span className="text-[10px] text-gray-400">by Creative Fabrica</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
          <Link href="/identify/logo"       className="hover:text-gray-900 transition-colors">Logos</Link>
          <Link href="/identify/poster"     className="hover:text-gray-900 transition-colors">Posters</Link>
          <Link href="/identify/screenshot" className="hover:text-gray-900 transition-colors">Screenshots</Link>
          <Link href="/identify/packaging"  className="hover:text-gray-900 transition-colors">Packaging</Link>
        </nav>

        {/* CTA */}
        <a
          href="https://www.creativefabrica.com/subscription/?utm_source=fontfinder&utm_medium=nav"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white
                     text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm
                     shadow-brand-200 hover:shadow-brand-300"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Get All Fonts
        </a>
      </div>
    </header>
  );
}
```

```tsx
// apps/web/components/ui/Footer.tsx
import Link from "next/link";

const LINKS = {
  "Use cases": [
    { label: "Logo fonts",     href: "/identify/logo" },
    { label: "Poster fonts",   href: "/identify/poster" },
    { label: "Screenshot",     href: "/identify/screenshot" },
    { label: "Book covers",    href: "/identify/book-cover" },
    { label: "Packaging",      href: "/identify/packaging" },
    { label: "Wedding cards",  href: "/identify/wedding" },
  ],
  "Creative Fabrica": [
    { label: "Font library",   href: "https://www.creativefabrica.com/fonts/" },
    { label: "Subscription",   href: "https://www.creativefabrica.com/subscription/" },
    { label: "Free fonts",     href: "https://www.creativefabrica.com/freebies/" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-xs">🔍</span>
              </div>
              <span className="font-bold text-gray-900">FontFinder</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Upload any design and instantly identify the fonts used.
              Powered by machine learning, backed by Creative Fabrica's 15M+ font library.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {group}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-brand-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row
                        items-center justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 Creative Fabrica. FontFinder is a free tool.</p>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
```


## Step 6 — Home Page (Full Redesign)

```tsx
// apps/web/app/page.tsx
import { ImageUploader } from "@/components/upload/ImageUploader";
import { HowItWorks } from "@/components/home/HowItWorks";
import { UseCaseGrid } from "@/components/home/UseCaseGrid";
import { SocialProof } from "@/components/home/SocialProof";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FontFinder — Upload Any Design, Identify the Font Instantly",
};

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-hero-mesh min-h-[92vh] flex flex-col items-center
                           justify-center px-4 sm:px-6 pt-4 pb-16">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-200/30
                        rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-200/30
                        rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-3xl mx-auto text-center space-y-6
                        animate-fade-up">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-brand-200
                          text-brand-700 text-xs font-semibold px-4 py-1.5 rounded-full
                          shadow-sm shadow-brand-100">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
            Free · No sign-up required · Instant results
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900
                         leading-[1.05] tracking-tight text-balance">
            What font{" "}
            <span className="text-gradient">is that?</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed text-balance">
            Drop any logo, poster, or screenshot.
            Our AI identifies the fonts and finds perfect pairings
            from Creative Fabrica's{" "}
            <span className="text-gray-700 font-semibold">15M+ font library</span>.
          </p>

          {/* Uploader */}
          <div className="pt-4">
            <ImageUploader source="home" />
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2
                          text-sm text-gray-400 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> Works on logos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> Posters & packaging
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> Screenshots & UIs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> Wedding stationery
            </span>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── Use case grid ────────────────────────────────────────────────── */}
      <UseCaseGrid />

      {/* ── Social proof ─────────────────────────────────────────────────── */}
      <SocialProof />

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-black text-gray-900">
            Ready to identify your font?
          </h2>
          <p className="text-gray-500 text-lg">
            No account needed. Just drop your image and get results in seconds.
          </p>
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700
                       text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all
                       shadow-xl shadow-brand-200 hover:shadow-brand-300 hover:-translate-y-0.5"
          >
            🔍 Try It Free
          </a>
        </div>
      </section>
    </div>
  );
}
```


## Step 7 — Home Supporting Sections

```tsx
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
```

```tsx
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
```

```tsx
// apps/web/components/home/SocialProof.tsx
const STATS = [
  { value: "15M+", label: "Fonts in CF library" },
  { value: "180+", label: "Font classes recognised" },
  { value: "97.8%", label: "Top-5 accuracy" },
  { value: "<2s",  label: "Average scan time" },
];

export function SocialProof() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-6 rounded-2xl bg-gray-50
                                           hover:bg-brand-50 transition-colors duration-300 group">
              <div className="text-4xl font-black text-gradient mb-1">
                {s.value}
              </div>
              <div className="text-sm text-gray-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```


## Step 8 — Upload Components (Full Redesign)

```tsx
// apps/web/components/upload/ImageUploader.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, ImageIcon, AlertCircle, Loader2 } from "lucide-react";
import { createJob, uploadImage, triggerProcessing } from "@/lib/jobs";
import { trackEvent } from "@/lib/analytics";

type Stage = "idle" | "creating" | "uploading" | "processing" | "error";

const STAGE_CONFIG = {
  creating:   { label: "Preparing...",          icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  uploading:  { label: "Uploading image...",     icon: <Upload className="w-4 h-4 animate-bounce" /> },
  processing: { label: "Identifying fonts...",   icon: <Loader2 className="w-4 h-4 animate-spin" /> },
};

export function ImageUploader({ source = "home" }: { source?: string }) {
  const router                    = useRouter();
  const [stage, setStage]         = useState<Stage>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [preview, setPreview]     = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setErrorMsg(null);
    setPreview(URL.createObjectURL(file));
    trackEvent("upload_started", { source });

    try {
      setStage("creating");
      const { jobId, imagePath } = await createJob(file.type);

      setStage("uploading");
      await uploadImage(file, imagePath, setUploadPct);

      setStage("processing");
      await triggerProcessing(jobId);

      trackEvent("upload_completed", { source, jobId });
      router.push(`/results/${jobId}`);
    } catch (err: any) {
      setStage("error");
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
    }
  }, [router, source]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[^0]) handleFile(accepted[^0]);
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: stage !== "idle" && stage !== "error",
    onDropRejected: (r) => {
      const code = r[^0]?.errors[^0]?.code;
      setErrorMsg(
        code === "file-too-large"    ? "Image too large. Maximum is 5MB." :
        code === "file-invalid-type" ? "Please upload a PNG, JPG, or WEBP." :
        "Could not upload that file."
      );
      setStage("error");
    },
  });

  const isActive = stage !== "idle" && stage !== "error";
  const stageConfig = isActive ? STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG] : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <div
        {...getRootProps()}
        className={`
          relative rounded-3xl border-2 border-dashed transition-all duration-300
          cursor-pointer overflow-hidden select-none
          ${isDragActive
            ? "border-brand-400 bg-brand-50 scale-[1.01] shadow-xl shadow-brand-100"
            : isActive
            ? "border-brand-300 bg-brand-50/50 pointer-events-none"
            : stage === "error"
            ? "border-red-300 bg-red-50/50 hover:border-red-400"
            : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-lg hover:shadow-brand-50"
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="p-8 sm:p-10">
          {/* Preview image */}
          {preview && stage !== "error" && (
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className={`max-h-48 rounded-2xl object-contain shadow-md
                              transition-all duration-500
                              ${isActive ? "opacity-60 blur-[1px]" : "opacity-100"}`}
                />
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2.5
                                    flex items-center gap-2 shadow-lg">
                      {stageConfig?.icon}
                      <span className="text-sm font-semibold text-gray-800">
                        {stageConfig?.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Idle state */}
          {stage === "idle" && !preview && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Upload icon area */}
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center
                               transition-all duration-300
                               ${isDragActive
                                 ? "bg-brand-100 scale-110"
                                 : "bg-gray-100 group-hover:bg-brand-50"}`}>
                {isDragActive
                  ? <ImageIcon className="w-9 h-9 text-brand-500" />
                  : <Upload   className="w-9 h-9 text-gray-400" />
                }
              </div>

              <div className="space-y-1 text-center">
                <p className="text-xl font-bold text-gray-800">
                  {isDragActive ? "Drop it here!" : "Drop your design here"}
                </p>
                <p className="text-gray-400 text-sm">
                  or{" "}
                  <span className="text-brand-600 font-semibold underline underline-offset-2">
                    click to browse
                  </span>
                  {" "}— PNG, JPG, WEBP · max 5MB
                </p>
              </div>

              {/* Supported types chips */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {["Logo", "Poster", "Screenshot", "Book cover", "Packaging"].map((t) => (
                  <span key={t}
                    className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active — processing stage (no preview) */}
          {isActive && !preview && (
            <div className="flex flex-col items-center gap-3 py-8">
              {stageConfig?.icon}
              <p className="text-brand-600 font-semibold">{stageConfig?.label}</p>
            </div>
          )}

          {/* Upload progress bar */}
          {stage === "uploading" && (
            <div className="mt-4 space-y-1.5">
              <div className="w-full bg-brand-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-violet-500 h-2 rounded-full
                               transition-all duration-300 ease-out"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Uploading...</span>
                <span>{uploadPct}%</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {stage === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-red-600">{errorMsg}</p>
                <p className="text-xs text-gray-400 mt-1">Click or drop to try again</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```


## Step 9 — Results Page (Full Redesign)

```tsx
// apps/web/app/results/[jobId]/page.tsx
import { ResultsView } from "@/components/results/ResultsView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Font Recognition Results" };

export default function ResultsPage({ params }: { params: { jobId: string } }) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Font Results</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Job #{params.jobId.slice(-8).toUpperCase()}
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

        <ResultsView jobId={params.jobId} />
      </div>
    </div>
  );
}
```

```tsx
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
      doc(db, "fontRecognitionJobs", jobId),
      (snap) => { if (snap.exists()) setJob(snap.data() as FontRecognitionJob); setLoading(false); },
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
            {job.processingMs}ms · {job.detectedFonts?.length} font{job.detectedFonts?.length !== 1 ? "s" : ""} found
          </div>
        </div>
      )}

      {/* Detected Fonts */}
      <Section emoji="🔍" title="Detected Fonts">
        {job.detectedFonts?.map((font, i) => (
          <FontResultCard
            key={i}
            font={font}
            isPrimary={i === job.primaryFontIndex}
            index={i}
          />
        ))}
      </Section>

      {/* CF Match */}
      <Section emoji="🎯" title="Best Match in CF Library">
        {(phase2 === "matching" && !job.cfMatch) && <MatchingSkeleton />}
        {job.cfMatch && <CFMatchCard match={job.cfMatch} />}
        {phase2 === "error" && !job.cfMatch && (
          <p className="text-sm text-red-400 py-3">
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
    <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-3">
      <div className="flex gap-3">
        <div className="skeleton h-16 w-24 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-6 w-36" />
          <div className="flex gap-1.5">
            <div className="skeleton h-5 w-14 rounded-full" />
            <div className="skeleton h-5 w-10 rounded-full" />
          </div>
        </div>
      </div>
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  );
}
```

```tsx
// apps/web/components/results/ProcessingState.tsx
export function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-brand-100 flex items-center justify-center">
          <span className="text-4xl animate-spin-slow">⚙️</span>
        </div>
        <div className="absolute -inset-2 rounded-[28px] border-2 border-brand-200
                        border-dashed animate-spin-slow" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">Identifying fonts...</p>
        <p className="text-sm text-gray-400 mt-1">Usually takes 5–15 seconds</p>
      </div>
      {/* Animated steps */}
      <div className="flex flex-col gap-2 w-full max-w-xs text-left">
        {[
          "Detecting text regions",
          "Extracting typographic features",
          "Matching against font library",
        ].map((step, i) => (
          <div key={step} className="flex items-center gap-2.5 text-sm text-gray-500">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse bg-brand-400`}
                 style={{ animationDelay: `${i * 0.4}s` }} />
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// apps/web/components/results/ErrorState.tsx
import Link from "next/link";

interface Props {
  type: "not-found" | "failed";
  message?: string;
  errorCode?: string;
}

export function ErrorState({ type, message, errorCode }: Props) {
  const isNotFound = type === "not-found";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
      <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center text-4xl">
        {isNotFound ? "🔍" : "😕"}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">
          {isNotFound ? "Job not found" : "Recognition failed"}
        </p>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          {message ?? (isNotFound
            ? "This scan may have expired. Please try uploading again."
            : "Something went wrong processing your image."
          )}
        </p>
        {errorCode === "NO_FONTS_DETECTED" && (
          <p className="text-xs text-gray-400 mt-2">
            💡 Try a closer crop with visible text on a clean background
          </p>
        )}
      </div>
      <Link
        href="/"
        className="bg-brand-600 hover:bg-brand-700 text-white font-bold
                   px-6 py-3 rounded-2xl transition-colors"
      >
        Try Another Image
      </Link>
    </div>
  );
}
```

```tsx
// apps/web/components/results/ResultsSkeleton.tsx
export function ResultsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="skeleton h-56 w-full rounded-3xl" />
      <div className="space-y-3">
        <div className="skeleton h-4 w-32" />
        <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-3">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-8 w-48" />
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
```


## Step 10 — Font Result Cards (Full Redesign)

```tsx
// apps/web/components/results/FontResultCard.tsx
import { DetectedFont } from "@/types";
import { ExternalLink, Star } from "lucide-react";

const UTM = "utm_source=fontfinder&utm_medium=results&utm_campaign=detected";

const CONFIDENCE_CONFIG = (c: number) =>
  c >= 0.8 ? { label: "High confidence",   color: "text-green-600",  bg: "bg-green-100"  } :
  c >= 0.5 ? { label: "Medium confidence", color: "text-amber-600",  bg: "bg-amber-100"  } :
             { label: "Low confidence",    color: "text-red-500",    bg: "bg-red-100"    };

export function FontResultCard({
  font, isPrimary, index,
}: { font: DetectedFont; isPrimary: boolean; index: number }) {
  const pct  = Math.round(font.confidence * 100);
  const conf = CONFIDENCE_CONFIG(font.confidence);

  return (
    <div className={`rounded-3xl border bg-white p-6 transition-all duration-200
                     hover:shadow-md animate-fade-up
                     ${isPrimary
                       ? "border-brand-200 shadow-sm shadow-brand-100"
                       : "border-gray-100"}`}
         style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex gap-4">
        {/* Left: preview image */}
        {font.previewImgUrl && (
          <img
            src={font.previewImgUrl}
            alt={font.identifiedName ?? "Font"}
            className="w-28 h-16 rounded-xl object-contain border border-gray-100 bg-gray-50
                       flex-shrink-0 self-start"
          />
        )}

        {/* Right: content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Role + badges */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {font.role}
                </span>
                {isPrimary && (
                  <span className="inline-flex items-center gap-1 text-xs bg-brand-100
                                   text-brand-700 px-2 py-0.5 rounded-full font-semibold">
                    <Star className="w-2.5 h-2.5 fill-current" /> Primary
                  </span>
                )}
                {font.inCFLibrary && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5
                                   rounded-full font-semibold">
                    In CF library
                  </span>
                )}
              </div>

              {/* Font name */}
              <h3 className="text-2xl font-black text-gray-900 truncate leading-tight">
                {font.identifiedName ?? "Unidentified font"}
              </h3>
            </div>

            {/* Confidence badge */}
            <div className={`${conf.bg} ${conf.color} text-xs font-bold px-2.5 py-1
                             rounded-xl flex-shrink-0 text-center`}>
              <div className="text-base font-black leading-none">{pct}%</div>
              <div className="text-[9px] uppercase tracking-wide mt-0.5">match</div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {[font.category, font.weight, ...(font.style === "italic" ? ["italic"] : [])].map((t) => (
              <span key={t}
                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full capitalize">
                {t}
              </span>
            ))}
            {font.moodTags.slice(0, 3).map((t) => (
              <span key={t}
                className="text-xs bg-brand-50 text-brand-600 px-2.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>

          {/* Notable features */}
          {font.notableFeatures && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {font.notableFeatures}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      {font.cfUrl && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <a
            href={`${font.cfUrl}?${UTM}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold
                       text-brand-600 hover:text-brand-700 transition-colors"
          >
            View {font.identifiedName} on Creative Fabrica
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
```

```tsx
// apps/web/components/results/CFMatchCard.tsx
import { CFMatch } from "@/types";
import { ExternalLink, Zap } from "lucide-react";

const UTM = "utm_source=fontfinder&utm_medium=results&utm_campaign=cf-match";

export function CFMatchCard({ match }: { match: CFMatch }) {
  const { font, matchType, similarity } = match;

  return (
    <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br
                    from-amber-50 to-orange-50 p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            {matchType === "exact" ? "Exact Match Found" : "Closest Match in CF Library"}
          </p>
          {similarity !== undefined && (
            <p className="text-xs text-amber-600">{Math.round(similarity * 100)}% similarity</p>
          )}
        </div>
        {font.isFree && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2.5 py-1
                           rounded-full font-semibold">
            Free
          </span>
        )}
      </div>

      {/* Font info */}
      <div className="flex gap-4 mb-5">
        {font.previewImgUrl && (
          <img
            src={font.previewImgUrl}
            alt={font.name}
            className="w-32 h-18 rounded-xl object-contain bg-white border border-amber-100
                       flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <h3 className="text-2xl font-black text-gray-900">{font.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[font.category, font.weight, ...font.moodTags.slice(0, 3)].map((t) => (
              <span key={t}
                className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full capitalize">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={`${font.cfUrl}?${UTM}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500
                     hover:bg-amber-600 text-white font-bold py-3 px-4
                     rounded-2xl transition-colors text-sm"
        >
          Get {font.name}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a
          href={`https://www.creativefabrica.com/subscription/?${UTM}&content=match-trial`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 border-2 border-amber-400
                     text-amber-700 hover:bg-amber-100 font-bold py-3 px-4
                     rounded-2xl transition-colors text-sm"
        >
          🔓 Unlock All CF Fonts
        </a>
      </div>
    </div>
  );
}
```

```tsx
// apps/web/components/results/PairingCard.tsx
import { FontPairing } from "@/types";
import { ExternalLink } from "lucide-react";

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  heading: { label: "Heading",  color: "bg-blue-100   text-blue-700"   },
  body:    { label: "Body",     color: "bg-green-100  text-green-700"  },
  accent:  { label: "Accent",   color: "bg-purple-100 text-purple-700" },
};

export function PairingCard({
  pairing, index, jobId,
}: { pairing: FontPairing; index: number; jobId: string }) {
  const { font, pairingRole, reason, useCase } = pairing;
  const role = ROLE_BADGE[pairingRole] ?? ROLE_BADGE.accent;
  const UTM  = `utm_source=fontfinder&utm_medium=results&utm_campaign=pairing-${index + 1}`;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 hover:shadow-md
                    transition-all duration-200 animate-fade-up group"
         style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex gap-4">
        {font.previewImgUrl && (
          <img
            src={font.previewImgUrl}
            alt={font.name}
            className="w-24 h-14 rounded-xl object-contain bg-gray-50 border border-gray-100
                       flex-shrink-0 self-start"
          />
        )}
        <div className="flex-1 min-w-0">
          {/* Role + free badge */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${role.color}`}>
              {role.label} font
            </span>
            {font.isFree && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5
                               rounded-full font-semibold">Free</span>
            )}
          </div>

          {/* Name */}
          <h3 className="text-xl font-black text-gray-900">{font.name}</h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {[font.category, font.weight, ...font.moodTags.slice(0, 2)].map((t) => (
              <span key={t}
                className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Why it works */}
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">Why it works: </span>{reason}
        </p>
        <p className="text-xs text-gray-400">
          <span className="font-medium text-gray-500">Best for: </span>{useCase}
        </p>
      </div>

      {/* CTA */}
      <a
        href={`${font.cfUrl}?${UTM}`}
        target="_blank" rel="noopener noreferrer"
        className="mt-4 w-full flex items-center justify-center gap-2
                   bg-brand-600 hover:bg-brand-700 text-white font-bold
                   py-3 rounded-2xl text-sm transition-all
                   group-hover:shadow-lg group-hover:shadow-brand-100"
      >
        Get {font.name} on Creative Fabrica
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
```


## Step 11 — Add Checkered Background CSS

For the uploaded image area — shows transparency pattern like Figma/Photoshop:

```css
/* Add to globals.css */
.bg-checkered {
  background-image:
    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
```


***

## Final Result

The complete UI gives you:[^1][^2]

- **Hero** — mesh gradient background, animated fade-up, drag-drop uploader with live preview
- **Processing** — spinning gear, animated step indicators, blur overlay on preview
- **Results** — confidence badges, mood tag chips, CF CTAs on every card
- **Pairings** — colour-coded role badges (heading/body/accent), "why it works" reasoning
- **Global CTA** — gradient card with decorative circles and trial offer
- **Mobile responsive** — all grid layouts collapse to single column on small screens

<div align="center">⁂</div>

[^1]: https://firebase.blog/posts/2025/04/apphosting-general-availability/

[^2]: https://blog.infernored.com/deploying-next-js-with-firebase-hosting-a-step-by-step-guide/

