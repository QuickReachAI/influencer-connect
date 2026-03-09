# Service Credentials Status

> Last updated: 2026-03-07

## Summary

| Status | Count |
|--------|-------|
| Configured (ready to use) | 3 |
| Partially configured | 3 |
| Not configured (needs setup) | 5 |

---

## Configured — Ready to Use

### 1. Supabase PostgreSQL (Database)

| Variable | Status |
|----------|--------|
| `DATABASE_URL` | Set (direct connection to `diienkzrqmtthpihutld.supabase.co`) |
| `DIRECT_URL` | Set (same host, direct) |

> **Note:** Both URLs point to port 5432 (direct). For production, `DATABASE_URL` should use port 6543 with `?pgbouncer=true` for connection pooling. Current setup works for development.

### 2. Pusher (Real-time Chat & Notifications)

| Variable | Status |
|----------|--------|
| `PUSHER_APP_ID` | `2124611` |
| `PUSHER_KEY` | `b48f86c687dd8c1ceb94` |
| `PUSHER_SECRET` | Set |
| `PUSHER_CLUSTER` | `ap2` |
| `NEXT_PUBLIC_PUSHER_KEY` | Set (matches server key) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `ap2` |

Fully configured and ready.

### 3. OAuth Encryption Key

| Variable | Status |
|----------|--------|
| `OAUTH_ENCRYPTION_KEY` | Set (32-byte hex) |

Used for encrypting social entity OAuth tokens at rest.

---

## Partially Configured — Has Placeholders

### 4. Inngest (Background Jobs)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `INNGEST_EVENT_KEY` | `dev_local_key` | Replace with production key from Inngest dashboard |
| `INNGEST_SIGNING_KEY` | `dev_local_signing_key` | Replace with production signing key |
| `ESCROW_RELEASE_DELAY` | `30s` (dev shortcut) | Change to `48h` for production (T+2 window) |

**Works for local dev** with `npx inngest-cli@latest dev`. Production needs real keys.

**How to get production credentials:**
1. Sign up at [inngest.com](https://www.inngest.com)
2. Create an app → go to **Settings** → copy **Event Key** and **Signing Key**
3. After deploying, sync your app URL in the Inngest dashboard (it auto-discovers `/api/inngest`)

### 5. Razorpay (Payments & Payouts)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `RAZORPAY_KEY_ID` | **Missing** | Get from Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | **Missing** | Get from Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | **Missing** | Generate when creating webhook |
| `RAZORPAY_PAYOUT_ACCOUNT_NUMBER` | `your_account_number` (placeholder) | Set to RazorpayX linked bank account |
| `RAZORPAY_PAYOUT_IFSC` | `your_ifsc` (placeholder) | Set to bank IFSC code |

**How to get credentials:**
1. Create a business account at [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Complete business KYC on the dashboard
3. Go to **Settings → API Keys → Generate Key** to get `KEY_ID` and `KEY_SECRET`
4. Go to **Settings → Webhooks → Add New Webhook**
   - URL: `https://yourdomain.com/api/deals/[id]/payment`
   - Events: `payment.captured`
   - Copy the webhook secret
5. For payouts: activate **RazorpayX** from the dashboard → **Payouts** section → link a bank account

### 6. Video Processing (AWS Lambda)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `VIDEO_LAMBDA_FUNCTION_NAME` | `influencer-connect-video-processor` | Correct, but the Lambda function must be deployed |
| `VIDEO_LAMBDA_REGION` | `ap-south-1` | Set |
| `S3_RAW_PREFIX` | `raw/` | Set |
| `S3_PROCESSED_PREFIX` | `processed/` | Set |
| `HLS_PRESIGNED_URL_EXPIRY` | `900` (15 min) | Set |

Config values are set but the Lambda function itself needs to be created and deployed (see AWS S3 section below).

---

## Not Configured — Needs Setup

### 7. NEXTAUTH_SECRET (Authentication)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `NEXTAUTH_SECRET` | **Missing from `.env`** | Generate and add |

**How to set up:**
```bash
# Generate a secure secret
openssl rand -base64 32
```
Add to `.env`:
```
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000
```

### 8. AWS S3 (File Storage)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `AWS_ACCESS_KEY_ID` | **Missing** | Create IAM user |
| `AWS_SECRET_ACCESS_KEY` | **Missing** | Create IAM user |
| `AWS_REGION` | **Missing** (use `ap-south-1`) | Add to `.env` |
| `AWS_S3_BUCKET` | **Missing** | Create bucket |

**How to set up:**
1. Go to [AWS Console → S3](https://s3.console.aws.amazon.com)
2. **Create bucket** in `ap-south-1` (Mumbai):
   - Name: e.g. `influencer-connect-files`
   - Block all public access: **ON** (files served via presigned URLs)
3. **Set CORS** on the bucket (for browser uploads):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Go to **IAM → Users → Create User**:
   - Attach an inline policy:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
           "Resource": "arn:aws:s3:::influencer-connect-files/*"
         }
       ]
     }
     ```
   - Create access key → copy `Access Key ID` and `Secret Access Key`
5. **Deploy the Lambda function** for video processing:
   - Runtime: Node.js 20.x (or Python 3.12)
   - Add an FFmpeg Lambda layer (e.g. `ffmpeg-lambda-layer`)
   - Memory: 3008 MB, Timeout: 15 minutes
   - Give it read/write access to the same S3 bucket
   - The function should handle actions: `validate`, `transcode`, `watermark`, `hls`, `clean-transcode`

### 9. Resend (Email)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `RESEND_API_KEY` | `re_your_api_key` (placeholder) | Get real API key |
| `RESEND_FROM_EMAIL` | `noreply@influencerconnect.in` | Verify this domain first |

**How to set up:**
1. Sign up at [resend.com](https://resend.com)
2. Go to **Domains → Add Domain** → add `influencerconnect.in`
3. Add the DNS records Resend provides (SPF, DKIM, DMARC) to your domain registrar
4. Wait for verification (usually < 1 hour)
5. Go to **API Keys → Create API Key** → copy the key (starts with `re_`)

### 10. Digio (KYC — Aadhaar/PAN Verification)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `DIGIO_API_KEY` | **Missing** | Get from Digio |
| `DIGIO_API_SECRET` | **Missing** | Get from Digio |
| `DIGIO_WEBHOOK_SECRET` | **Missing** | Get from Digio |

> Currently runs in **mock mode** during development (auto-passes KYC). Production code path is fully written.

**How to set up:**
1. Sign up at [digio.in](https://www.digio.in) → request API access
2. Start with **sandbox credentials** for testing
3. Go to dashboard → **API Settings** → copy API Key and Secret
4. Set up webhook endpoint: `https://yourdomain.com/api/auth/kyc` → copy webhook secret
5. For production: complete Digio's onboarding process and switch to live credentials

### 11. GSTIN API (KYB — Business Verification)

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `GSTIN_API_URL` | `https://api.gridlines.io/gstin-api/gst` | Set (Gridlines) |
| `GSTIN_API_KEY` | `your_gridlines_api_key` (placeholder) | Get real API key |

**How to set up:**
1. Sign up at [gridlines.io](https://gridlines.io) (or alternative: Surepass, HyperVerge)
2. Subscribe to the GSTIN verification API plan
3. Go to dashboard → copy API key

### 12. Upstash Redis (Rate Limiting) — Optional

| Variable | Status | Action Needed |
|----------|--------|---------------|
| `REDIS_URL` | **Missing** | Create Upstash instance |

> **Optional in dev** — falls back to in-memory rate limiting. **Required for production** with multiple server instances.

**How to set up:**
1. Sign up at [upstash.com](https://upstash.com)
2. Create a Redis database → region: `ap-south-1` (or closest to your server)
3. Copy the **REST URL** (not the `redis://` URL — Upstash SDK uses HTTP)

---

## Quick Setup Checklist

```
Credential                         Status
─────────────────────────────────────────────────
[x] DATABASE_URL                   Configured
[x] DIRECT_URL                     Configured
[ ] NEXTAUTH_SECRET                Missing
[x] OAUTH_ENCRYPTION_KEY           Configured
[ ] RAZORPAY_KEY_ID                Missing
[ ] RAZORPAY_KEY_SECRET            Missing
[ ] RAZORPAY_WEBHOOK_SECRET        Missing
[ ] RAZORPAY_PAYOUT_ACCOUNT_NUMBER Placeholder
[x] PUSHER_APP_ID                  Configured
[x] PUSHER_KEY                     Configured
[x] PUSHER_SECRET                  Configured
[x] PUSHER_CLUSTER                 Configured
[x] NEXT_PUBLIC_PUSHER_KEY         Configured
[x] NEXT_PUBLIC_PUSHER_CLUSTER     Configured
[ ] AWS_ACCESS_KEY_ID              Missing
[ ] AWS_SECRET_ACCESS_KEY          Missing
[ ] AWS_REGION                     Missing
[ ] AWS_S3_BUCKET                  Missing
[ ] RESEND_API_KEY                 Placeholder
[x] RESEND_FROM_EMAIL              Set
[ ] DIGIO_API_KEY                  Missing
[ ] DIGIO_API_SECRET               Missing
[ ] DIGIO_WEBHOOK_SECRET           Missing
[x] GSTIN_API_URL                  Set
[ ] GSTIN_API_KEY                  Placeholder
[ ] REDIS_URL                      Missing (optional)
[ ] INNGEST_EVENT_KEY              Dev-only key
[ ] INNGEST_SIGNING_KEY            Dev-only key
[x] ESCROW_RELEASE_DELAY           Set (30s dev)
[x] VIDEO_LAMBDA_FUNCTION_NAME     Set
[x] VIDEO_LAMBDA_REGION            Set
[x] S3_RAW_PREFIX                  Set
[x] S3_PROCESSED_PREFIX            Set
[x] HLS_PRESIGNED_URL_EXPIRY       Set
```

**Score: 15 / 30 configured** — 8 missing, 4 placeholders, 3 dev-only values.

### Priority Order for Setup

1. **NEXTAUTH_SECRET** — app won't authenticate without it
2. **Razorpay** — core payment flow blocked
3. **AWS S3** — file uploads blocked
4. **Resend** — email notifications won't send
5. **Digio** — KYC stays in mock mode (acceptable for dev)
6. **GSTIN API key** — KYB verification won't work
7. **Inngest production keys** — needed only at deployment
8. **Upstash Redis** — optional until multi-instance deployment
