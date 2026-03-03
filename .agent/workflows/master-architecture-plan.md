# Architectural Implementation Plan: InfluencerConnect

Based on the Master Operational & Architectural Blueprint and our analysis of the current Next.js/Prisma prototype, here is the expanded technical execution plan. This architecture is designed for scale, resilience, strict adherence to the "Zero Tolerance" and "Human-in-the-Loop" mediation models, complete backend robustness, and a polished, professional UI/UX. Use skills that have been installed if needed.

## 1. UI/UX Overhaul & Frontend Robustness
The current UI will be upgraded from a "vibecoded" prototype to a professional, high-trust marketplace standard (similar to Fiverr/Upwork).
*   **Design System:** Standardize the color palette, typography, and spacing using Tailwind CSS. Remove inconsistent styles and enforce a strict component library (e.g., shadcn/ui).
*   **Global Toasts & Feedback:** Integrate a robust toast notification system (e.g., `sonner` or `react-hot-toast`) to provide immediate, clear feedback for all user actions (success, error, warning).
*   **Link & Navigation Audit:** Ensure every link, button, and navigation menu item is fully wired to its respective page or action. No dead ends.

## 2. Comprehensive Backend Completion & Testing
We will ensure every backend procedure is fully developed, connected, and thoroughly tested.
*   **API Route Coverage:** Develop and complete all necessary REST APIs for User Profiles, Gigs, Orders, Admin Stats, and Chat.
*   **Zod Validation Layer:** Enforce strict Zod schemas for every incoming API request and form submission to prevent malformed data.
*   **Error Handling & Edge Cases:** Implement global error handlers. Add specific checks for race conditions (e.g., double payments, rapid successive clicks) and gracefully handle third-party API failures (Razorpay, AWS, Digio).

## 3. API Security & Rate Limiting
To build a bulletproof platform, we must protect our infrastructure from abuse and brute-force attacks.
*   **Rate Limiting:** Integrate `@upstash/ratelimit` with Redis.
*   **Policies:** Apply strict rate limits to sensitive endpoints (e.g., Login, Signup, KYC Verification, Payment Initiation) and moderate limits to general data fetching.
*   **CSRF & XSS:** Ensure robust protection against CSRF (NextAuth handles much of this) and sanitize all rich-text inputs to prevent XSS.

## 4. Zero-Tolerance Identity Layer (KYC)
We will leverage Digio for Aadhaar/PAN verification as it is cost-effective and provides the required immutable hash.
*   **Implementation:** Replace the mocked `callKYCProvider` in `kyc.service.ts` with the live Digio API integration.
*   **Security:** Ensure the Aadhaar/PAN hashes (`aadhaarHash`, `panHash`) are enforced as `UNIQUE` constraints in the Prisma schema to make the "Lifetime Ban" physically impossible to bypass by registering a new email.

## 5. Event-Driven Chat & Leakage Prevention
To meet the requirement for high-scale, low-cost event-driven chat, we will implement **Server-Sent Events (SSE)**.
*   **Implementation:** Create a streaming Next.js Edge API route (`app/api/chat/[dealId]/stream/route.ts`) returning an `event-stream`.
*   **Processing:** Hook the existing `chat.service.ts` `detectForbiddenContent` regex into the REST `POST` route. If flagged, it will instantly notify the internal staff dashboard and halt the chat if a threshold is reached.

## 6. Dual-Phase Escrow & Ledger State Machine
*   **State Management:** Enforce a strict Enum state machine in Prisma (`PENDING`, `ESCROW_HALF`, `PRODUCTION`, `DELIVERED`, `INSPECTION`, `COMPLETED`, `DISPUTED`).
*   **Async Job Queue (T+2):** Replace the `setTimeout` memory-leak risk with an external job queue (e.g., Upstash QStash) to schedule the `releaseFundsToCreator` function 48 hours after the final 50% is paid.

## 7. Secure Media Pipeline (Pre-Release Verification)
*   **Direct-to-S3:** Implement `getSignedUrl` in Next.js to allow the client browser to upload directly to AWS S3.
*   **Async Worker:** Set up an AWS Lambda function triggered by `s3:ObjectCreated:Put`. This Lambda will run `ffprobe` to verify file length, resolution, and format.
*   **Webhook Trigger:** Upon success, the Lambda pings our Next.js API to update the Escrow State Machine to `DELIVERED` and notifies the Brand to pay the remaining 50%.

## 8. Human-in-the-Loop Staff Dashboard
*   **Mediation UI:** Build the UI components for `/dashboard/admin/disputes` giving staff access to the locked conversation history (snapshots).
*   **Override Controls:** Wire up the "Release Funds" and "Refund to Brand" toggle switches directly to the Razorpay API integration in `escrow.service.ts`.
