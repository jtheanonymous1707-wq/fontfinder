// apps/web/lib/jobs.ts
import { db, storage } from "./firebase";
import { collection, setDoc, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/**
 * Creates a new font recognition job record in Firestore.
 */
export async function createJob(contentType: string) {
  const docRef = doc(collection(db, "fontJobs"));
  const jobId = docRef.id;
  const imagePath = `uploads/${jobId}/${Date.now()}`;

  await setDoc(docRef, {
    status: "queued",
    createdAt: serverTimestamp(),
    imageMimeType: contentType,
    imagePath: imagePath,
  });

  return { jobId, imagePath };
}

/**
 * Uploads an image to Firebase Storage and updates the job record.
 */
export async function uploadImage(
  file: File,
  imagePath: string,
  onProgress: (pct: number) => void
) {
  const storageRef = ref(storage, imagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadUrl);
      }
    );
  });
}

/**
 * Triggers the backend processing (usually via a Firestore trigger or an HTTP function).
 * For now, we update the job with the image URL which will trigger the Cloud Function.
 */
export async function triggerProcessing(jobId: string, imagePath?: string) {
  const jobRef = doc(db, "fontJobs", jobId);
  // In a real app, the Cloud Function might trigger on this update
  await updateDoc(jobRef, {
    status: "processing",
    ...(imagePath ? { imagePath } : {})
  });
}


/**
 * Triggers Phase 2 matching (finding the best match in CF library).
 */
export async function triggerCFMatch(jobId: string) {
  // This would usually call a Firebase Function (Callable)
  // For now we'll simulate the call or just wait for the backend to update
  console.log(`Triggering CF Match for ${jobId}`);
}

/**
 * Triggers Phase 2 pairings (finding complementary fonts).
 */
export async function triggerPairings(jobId: string) {
  // This would usually call a Firebase Function (Callable)
  console.log(`Triggering Pairings for ${jobId}`);
}
