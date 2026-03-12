<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Can we deploy it to firebase app hosting

Yes — **Firebase App Hosting** now has full GA support for Next.js including App Router, SSR, and Server Components as of April 2025.  It's a great choice for your project since everything (Firestore, Auth, Storage, Functions, and the frontend) lives in the same GCP project with no cross-platform auth complexity.[^1][^2][^3]

***

## Firebase App Hosting vs Vercel For Your Case

|  | Firebase App Hosting | Vercel |
| :-- | :-- | :-- |
| Next.js App Router + SSR | ✅ Full support | ✅ Full support |
| Same project as Firestore/Auth | ✅ Native | ❌ Cross-project |
| GitHub auto-deploy | ✅ Built-in | ✅ Built-in |
| Preview channels per PR | ✅ Yes | ✅ Yes |
| Pricing | Pay-as-you-go GCP | Free tier + \$20/mo pro |
| Cold starts | Slightly slower | Faster |
| Setup complexity | Medium | Very easy |

Since your whole backend is already on Firebase/GCP, App Hosting is the cleaner choice — one bill, one console, no CORS configuration between services.[^2][^3]

***

## Step 1 — Prerequisites

```bash
# Upgrade Firebase CLI to latest (App Hosting requires 13.15+)
npm install -g firebase-tools@latest
firebase --version    # Should be 13.15+

# Login
firebase login

# Confirm your project
firebase projects:list
```


***

## Step 2 — Connect GitHub Repo

Firebase App Hosting deploys from GitHub — not from CLI push like old Firebase Hosting. You need your code on GitHub first.[^4][^1]

```bash
# From apps/web (or project root)
git init
git add .
git commit -m "feat: font identifier satellite app"

# Create repo on GitHub (replace with your username)
gh repo create font-identifier --public --source=. --push
# Or manually: github.com/new → push existing repo
```


***

## Step 3 — Initialise Firebase App Hosting

```bash
# From apps/web/
firebase init apphosting
```

You'll be prompted through this flow:

```
? Which Firebase project do you want to use?
  → Select your existing project (same one as Firestore/Functions)

? Create a new backend, or use an existing one?
  → Create a new backend

? Provide a name for your backend: (e.g. font-identifier-web)
  → font-identifier-web

? In which region would you like to host server-side content?
  → asia-southeast1   ← same region as your Cloud Functions + Cloud Run

? Connect to GitHub?
  → Yes

? Authenticate with GitHub
  → Follow browser auth flow

? For which GitHub repo do you want to set up automatic deploys?
  → YOUR_USERNAME/font-identifier

? Specify your root directory relative to your repository
  → apps/web   (or ./ if your repo root IS apps/web)

? Set up automatic deployments from branch?
  → main

? Do you want to deploy now?
  → Yes
```

This creates `apphosting.yaml` in your project.[^1][^4]

***

## Step 4 — `apphosting.yaml`

Firebase App Hosting uses this file for environment variables and runtime config — equivalent to Vercel's environment variable dashboard.[^3]

```yaml
# apps/web/apphosting.yaml

runConfig:
  minInstances: 0       # Scale to zero when no traffic (cost saving)
  maxInstances: 10
  concurrency: 80
  cpu: 1
  memoryMiB: 512

env:
  # Firebase client config — these are public, safe to commit
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: YOUR_API_KEY

  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: YOUR_PROJECT_ID.firebaseapp.com

  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: YOUR_PROJECT_ID

  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    value: YOUR_PROJECT_ID.appspot.com

  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    value: YOUR_SENDER_ID

  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: YOUR_APP_ID

  - variable: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    value: YOUR_MEASUREMENT_ID

  # Cloud Functions base URL — production
  - variable: NEXT_PUBLIC_FUNCTIONS_BASE_URL
    value: https://asia-southeast1-YOUR_PROJECT_ID.cloudfunctions.net
    availability:
      - BUILD
      - RUNTIME
```

> **Never put secret keys in `apphosting.yaml`** — it gets committed to GitHub. For any truly secret values, use Firebase Secret Manager instead (shown below).

***

## Step 5 — Store Secrets Securely (If Needed)

If you have any server-side secrets (e.g. a private API key used in Server Components or Route Handlers), store them in Secret Manager — not in `apphosting.yaml`.[^3]

```bash
# Create a secret
firebase apphosting:secrets:set MY_SECRET_KEY

# Grant App Hosting access to it
firebase apphosting:secrets:grantaccess MY_SECRET_KEY --backend font-identifier-web

# Reference it in apphosting.yaml
```

```yaml
# In apphosting.yaml — reference a secret like this:
env:
  - variable: MY_SECRET_KEY
    secret: MY_SECRET_KEY   # References Firebase Secret Manager
    availability:
      - RUNTIME   # Only available server-side, never sent to browser
```


***

## Step 6 — Update `next.config.ts` for App Hosting

Firebase App Hosting runs Next.js on Cloud Run behind the scenes. One small addition needed — tell Next.js to trust the GCP forwarded headers for correct URL resolution:[^1]

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Firebase App Hosting (runs behind GCP load balancer)
  experimental: {
    serverActions: {
      allowedOrigins: [
        "YOUR_PROJECT_ID.web.app",
        "YOUR_PROJECT_ID.firebaseapp.com",
        "*.YOUR_CUSTOM_DOMAIN.com",   // Add if using custom domain
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "*.creativefabrica.com" },
    ],
  },
};

export default nextConfig;
```


***

## Step 7 — Deploy

```bash
# Commit apphosting.yaml and next.config.ts changes
git add apphosting.yaml next.config.ts
git commit -m "chore: add Firebase App Hosting config"
git push origin main

# Push to main triggers automatic deploy via Cloud Build
# Watch progress in Firebase console → App Hosting → font-identifier-web
# Or watch via CLI:
firebase apphosting:backends:get font-identifier-web
```

Build takes **3–5 minutes** on first deploy. Subsequent deploys on push to `main` are automatic.[^4][^1]

***

## Step 8 — View Live URL

```bash
# After deploy completes, get your URL
firebase apphosting:backends:list

# Output:
# Backend: font-identifier-web
# URL: https://font-identifier-web--YOUR_HASH.YOUR_REGION.hosted.app
# Status: ACTIVE
```

You also get a **stable URL** at:

```
https://YOUR_PROJECT_ID.web.app
```


***

## Step 9 — Add Custom Domain (Optional)

```bash
# Firebase Console → App Hosting → font-identifier-web → Custom domains
# Add your domain e.g. fonts.yourdomain.com
# Firebase provides the DNS records to add

# Or via CLI
firebase hosting:channel:deploy production --expires 365d
```


***

## Step 10 — Set Up Preview Channels for PRs

Firebase App Hosting automatically creates **preview URLs for every pull request** — great for testing before merging.[^1]

```bash
# This happens automatically when you push to non-main branches
git checkout -b feature/new-component
git push origin feature/new-component

# Firebase builds a preview at:
# https://font-identifier-web--pr123-HASH.YOUR_REGION.hosted.app
```


***

## Remove Vercel-Specific Files

Since you're using App Hosting instead of Vercel, clean up:

```bash
# Remove Vercel config if you added it
rm -f vercel.json
rm -f apps/web/vercel.json

# next-sitemap still works fine — keep it
# Remove the Vercel CLI deployment section from your notes
```

Also remove `next-sitemap` post-build Vercel-specific config — it works the same on App Hosting:

```json
// package.json — this stays exactly the same, works on App Hosting
{
  "scripts": {
    "build": "next build",
    "postbuild": "next-sitemap"
  }
}
```


***

## Deployment Checklist

| \# | Task | Done When |
| :-- | :-- | :-- |
| 1 | Firebase CLI 13.15+ installed | `firebase --version` shows correct version |
| 2 | Code pushed to GitHub | Repo visible at github.com |
| 3 | `firebase init apphosting` completed | `apphosting.yaml` exists |
| 4 | All env vars set in `apphosting.yaml` | No `undefined` errors in build |
| 5 | `git push origin main` triggers build | Cloud Build starts in Firebase console |
| 6 | Build completes successfully | Firebase console shows ACTIVE status |
| 7 | Live URL returns homepage | Browser test passes |
| 8 | Upload flow works end-to-end | Job appears in Firestore + results show |
| 9 | Sitemap accessible at `/sitemap.xml` | `curl https://YOUR_URL/sitemap.xml` |

<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://firebase.blog/posts/2025/04/apphosting-general-availability/

[^2]: https://www.youtube.com/watch?v=QOwtPwir0yE

[^3]: https://firebase.google.com/docs/app-hosting

[^4]: https://blog.infernored.com/deploying-next-js-with-firebase-hosting-a-step-by-step-guide/

[^5]: https://io.google/2025/explore/technical-session-52/

[^6]: https://firebase.google.com/docs/hosting/frameworks/nextjs

[^7]: https://www.youtube.com/watch?v=XEhd9a9YhSk

[^8]: https://www.buildmvpfast.com/compare/firebase-vs-vercel

[^9]: https://news.ycombinator.com/item?id=40360217

[^10]: https://io.google/2025/explore/technical-session-52

[^11]: https://www.reddit.com/r/googlecloud/comments/1f2ooe9/firebase_app_hosting_vs_vercel/

[^12]: https://getdeploying.com/firebase-vs-vercel

[^13]: https://www.reddit.com/r/Firebase/comments/1k36h0k/firebase_nextjs_app_hosting_rollout_failing_with/

[^14]: https://uibakery.io/blog/vercel-vs-firebase

[^15]: https://firebase.blog/posts/2025/06/app-hosting-frameworks/

