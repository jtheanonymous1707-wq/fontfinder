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
      await triggerProcessing(jobId, imagePath);

      trackEvent("upload_completed", { source, jobId });
      router.push(`/results/${jobId}`);
    } catch (err: any) {
      setStage("error");
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
    }
  }, [router, source]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) handleFile(accepted[0]);
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: stage !== "idle" && stage !== "error",
    onDropRejected: (r) => {
      const code = r[0]?.errors[0]?.code;
      setErrorMsg(
        code === "file-too-large"    ? "Image too large. Maximum is 10MB." :
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
          {(stage === "idle" || stage === "error") && !preview && (
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
                  {" "}— PNG, JPG, WEBP · max 10MB
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
