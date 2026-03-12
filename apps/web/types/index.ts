// apps/web/types/index.ts

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface DetectedFont {
  identifiedName: string;
  role: "heading" | "body" | "accent";
  confidence: number; // 0.0 to 1.0
  category: string; // e.g., "serif", "sans-serif"
  weight: string; // e.g., "bold"
  style: "normal" | "italic";
  moodTags: string[];
  notableFeatures?: string;
  inCFLibrary: boolean;
  cfUrl?: string;
  previewImgUrl?: string;
}

export interface CFMatch {
  font: {
    name: string;
    cfUrl: string;
    previewImgUrl: string;
    category: string;
    weight: string;
    moodTags: string[];
    isFree: boolean;
  };
  matchType: "exact" | "similar";
  similarity: number;
}

export interface FontPairing {
  font: {
    name: string;
    cfUrl: string;
    previewImgUrl: string;
    category: string;
    weight: string;
    moodTags: string[];
    isFree: boolean;
  };
  pairingRole: "heading" | "body" | "accent";
  reason: string;
  useCase: string;
}

export interface FontRecognitionJob {
  id: string;
  status: JobStatus;
  createdAt: number;
  imagePath?: string;
  imageDownloadUrl?: string;
  contentType?: string;
  
  // Results
  detectedFonts?: DetectedFont[];
  primaryFontIndex?: number;
  processingMs?: number;
  
  // Phase 2
  cfMatch?: CFMatch;
  pairings?: FontPairing[];
  
  // Errors
  error?: string;
  errorCode?: "NO_FONTS_DETECTED" | "PROCESSING_ERROR" | "UPLOAD_ERROR";
}
