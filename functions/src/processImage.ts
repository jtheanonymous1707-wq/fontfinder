// functions/src/processImage.ts
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { GoogleAuth } from "google-auth-library";
import axios from "axios";
import FormData from "form-data";

// Initialize admin if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const storage = admin.storage();
const db = admin.firestore();

const RECOGNITION_URL = process.env.RECOGNITION_SERVICE_URL || "";

// Cache auth client — don't recreate per request
let _authClient: any = null;
async function getIdentityToken(targetUrl: string): Promise<string> {
  if (!_authClient) {
    const auth = new GoogleAuth();
    _authClient = await auth.getIdTokenClient(targetUrl);
  }
  const tokenRes = await _authClient.getRequestHeaders(targetUrl);
  const authHeader = tokenRes["Authorization"];
  if (!authHeader) throw new Error("Could not get identity token");
  return authHeader.replace("Bearer ", "");
}

/**
 * Triggered by a Firestore write to a 'fontJobs' collection.
 * This is an example of how you might trigger the processing.
 */
export const processFontImage = functions.region("asia-southeast1").firestore
  .document("fontJobs/{jobId}")
  .onUpdate(async (change, context) => {
    const jobId = context.params.jobId;
    const before = change.before.data();
    const after = change.after.data();

    // Only proceed if status changed to 'processing'
    if (before?.status === "processing" || after?.status !== "processing") {
        return;
    }

    const job = after;
    const startTime = Date.now();
    const jobRef = change.after.ref;

    if (!job || !job.imagePath) {
        console.error("Job or imagePath missing");
        return;
    }

    try {
      // 1. Load image from Storage
      const bucket = storage.bucket();
      const file = bucket.file(job.imagePath);
      const [exists] = await file.exists();
      if (!exists) throw new Error(`IMAGE_NOT_FOUND: ${job.imagePath}`);
      const [imageBuffer] = await file.download();

      // 2. Get Cloud Run identity token
      const token = await getIdentityToken(RECOGNITION_URL);

      // 3. Build multipart form and call Cloud Run
      const formData = new FormData();
      formData.append("image", imageBuffer, {
        filename: "upload.jpg",
        contentType: job.imageMimeType || "image/jpeg",
      });

      console.log(`Calling recognition service at ${RECOGNITION_URL}/recognize`);
      const response = await axios.post(
        `${RECOGNITION_URL}/recognize`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${token}`,
          },
          timeout: 90000,
        }
      );

      const { predictions, topPrediction, patchesAnalyzed, processingMs } = response.data;

      if (!topPrediction) throw new Error("NO_FONTS_DETECTED");

      // 4. Map into DetectedFont shape
      const detectedFonts = predictions.map((p: any, i: number) => ({
        role:             i === 0 ? "heading" : "unknown",
        identifiedName:   p.name ?? p.slug,
        confidence:       p.confidence,
        category:         p.category ?? "unknown",
        weight:           p.weight ?? "regular",
        style:            "normal",
        moodTags:         p.moodTags ?? [],
        notableFeatures:  `Detected by CNN — ${patchesAnalyzed} patch(es) in ${processingMs}ms`,
        sampleCharacters: "",
        pairingStyle:     `Complement this ${p.category ?? "display"} font with a contrasting style`,
        cfUrl:            p.cfUrl ?? null,
        previewImgUrl:    p.previewImgUrl ?? null,
        isFree:           p.isFree ?? false,
        inCFLibrary:      !!p.cfUrl,
      }));

      // 5. Get signed URL for image preview
      const [downloadUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      // 6. Update Firestore
      await jobRef.update({
        status:           "completed",
        detectedFonts,
        primaryFont:      detectedFonts[0],
        primaryFontIndex: 0,
        imageDownloadUrl: downloadUrl,
        processingMs:     Date.now() - startTime,
        updatedAt:        admin.firestore.Timestamp.now(),
      });

      console.log(`Job ${jobId} completed successfully.`);

    } catch (err: any) {
      console.error(`Error processing job ${jobId}:`, err);
      await jobRef.update({
        status: "failed",
        error: err.message || "Unknown error",
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  });
