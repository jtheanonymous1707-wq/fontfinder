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
