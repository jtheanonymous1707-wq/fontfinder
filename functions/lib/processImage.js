"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFontImage = void 0;
// functions/src/processImage.ts
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const google_auth_library_1 = require("google-auth-library");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
// Initialize admin if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const storage = admin.storage();
const db = admin.firestore();
const RECOGNITION_URL = process.env.RECOGNITION_SERVICE_URL || "";
// Cache auth client — don't recreate per request
let _authClient = null;
async function getIdentityToken(targetUrl) {
    if (!_authClient) {
        const auth = new google_auth_library_1.GoogleAuth();
        _authClient = await auth.getIdTokenClient(targetUrl);
    }
    const tokenRes = await _authClient.getRequestHeaders(targetUrl);
    const authHeader = tokenRes["Authorization"];
    if (!authHeader)
        throw new Error("Could not get identity token");
    return authHeader.replace("Bearer ", "");
}
/**
 * Triggered by a Firestore write to a 'fontJobs' collection.
 * This is an example of how you might trigger the processing.
 */
exports.processFontImage = functions.region("asia-southeast1").firestore
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
        if (!exists)
            throw new Error(`IMAGE_NOT_FOUND: ${job.imagePath}`);
        const [imageBuffer] = await file.download();
        // 2. Get Cloud Run identity token
        const token = await getIdentityToken(RECOGNITION_URL);
        // 3. Build multipart form and call Cloud Run
        const formData = new form_data_1.default();
        formData.append("image", imageBuffer, {
            filename: "upload.jpg",
            contentType: job.imageMimeType || "image/jpeg",
        });
        console.log(`Calling recognition service at ${RECOGNITION_URL}/recognize`);
        const response = await axios_1.default.post(`${RECOGNITION_URL}/recognize`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`,
            },
            timeout: 90000,
        });
        const { predictions, topPrediction, patchesAnalyzed, processingMs } = response.data;
        if (!topPrediction)
            throw new Error("NO_FONTS_DETECTED");
        // 4. Map into DetectedFont shape
        const detectedFonts = predictions.map((p, i) => ({
            role: i === 0 ? "heading" : "unknown",
            identifiedName: p.name ?? p.slug,
            confidence: p.confidence,
            category: p.category ?? "unknown",
            weight: p.weight ?? "regular",
            style: "normal",
            moodTags: p.moodTags ?? [],
            notableFeatures: `Detected by CNN — ${patchesAnalyzed} patch(es) in ${processingMs}ms`,
            sampleCharacters: "",
            pairingStyle: `Complement this ${p.category ?? "display"} font with a contrasting style`,
            cfUrl: p.cfUrl ?? null,
            previewImgUrl: p.previewImgUrl ?? null,
            isFree: p.isFree ?? false,
            inCFLibrary: !!p.cfUrl,
        }));
        // 5. Get signed URL for image preview
        const [downloadUrl] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        // 6. Update Firestore
        await jobRef.update({
            status: "completed",
            detectedFonts,
            primaryFont: detectedFonts[0],
            primaryFontIndex: 0,
            imageDownloadUrl: downloadUrl,
            processingMs: Date.now() - startTime,
            updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`Job ${jobId} completed successfully.`);
    }
    catch (err) {
        console.error(`Error processing job ${jobId}:`, err);
        await jobRef.update({
            status: "failed",
            error: err.message || "Unknown error",
            updatedAt: admin.firestore.Timestamp.now(),
        });
    }
});
//# sourceMappingURL=processImage.js.map