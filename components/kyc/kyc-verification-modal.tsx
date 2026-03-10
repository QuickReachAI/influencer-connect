"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Fingerprint,
  Phone,
  ArrowRight,
  PartyPopper,
} from "lucide-react";

interface KYCVerificationModalProps {
  userPhone?: string;
  onClose: () => void;
}

type Step = "input" | "processing" | "result";

interface VerificationStep {
  label: string;
  status: "pending" | "active" | "done";
}

export function KYCVerificationModal({ userPhone, onClose }: KYCVerificationModalProps) {
  const [step, setStep] = useState<Step>("input");

  // Form state
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [phone, setPhone] = useState(userPhone || "");
  const [agreed, setAgreed] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Processing state
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([
    { label: "Validating document format...", status: "pending" },
    { label: "Verifying PAN details...", status: "pending" },
    { label: "Verifying Aadhaar...", status: "pending" },
    { label: "Cross-referencing identity...", status: "pending" },
    { label: "Generating verification report...", status: "pending" },
  ]);

  // Result state
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const apiCalled = useRef(false);

  // Format Aadhaar as XXXX XXXX XXXX
  const formatAadhaar = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(" ");
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAadhaar(raw);
    if (formErrors.aadhaar) setFormErrors(prev => ({ ...prev, aadhaar: "" }));
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setPan(value);
    if (formErrors.pan) setFormErrors(prev => ({ ...prev, pan: "" }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: "" }));
  };

  // Validate form
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (aadhaar.length !== 12) {
      errors.aadhaar = "Aadhaar must be exactly 12 digits";
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
      errors.pan = "PAN must be in format ABCDE1234F";
    }

    if (phone.length !== 10) {
      errors.phone = "Phone must be exactly 10 digits";
    }

    if (!agreed) {
      errors.agreed = "You must agree to the verification terms";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setStep("processing");
  };

  // Processing animation + API call
  useEffect(() => {
    if (step !== "processing") return;

    const delays = [300, 1500, 2000, 1000, 1000]; // ms for each step
    let totalDelay = 0;

    // Start the API call at the beginning of step 2
    if (!apiCalled.current) {
      apiCalled.current = true;

      fetch("/api/auth/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaarNumber: aadhaar,
          panNumber: pan,
          phone: phone,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success) {
            setResult({ success: true });
          } else {
            setResult({ success: false, error: data.error || "Verification failed" });
          }
        })
        .catch(() => {
          setResult({ success: false, error: "Network error. Please try again." });
        });
    }

    // Animate steps sequentially
    delays.forEach((delay, index) => {
      // Mark step as active
      setTimeout(() => {
        setVerificationSteps(prev =>
          prev.map((s, i) => ({
            ...s,
            status: i === index ? "active" : i < index ? "done" : "pending",
          }))
        );
      }, totalDelay);

      totalDelay += delay;

      // Mark step as done
      setTimeout(() => {
        setVerificationSteps(prev =>
          prev.map((s, i) => ({
            ...s,
            status: i <= index ? "done" : s.status,
          }))
        );
      }, totalDelay);
    });

    // After all animation steps complete, move to result
    setTimeout(() => {
      setStep("result");
    }, totalDelay + 500);
  }, [step, aadhaar, pan, phone]);

  // Confetti effect on success
  useEffect(() => {
    if (step === "result" && result?.success) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [step, result]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                fontSize: `${12 + Math.random() * 16}px`,
                opacity: 0.8,
              }}
            >
              {["🎉", "🎊", "✨", "🎯", "💫"][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#0E61FF]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">KYC Verification</h2>
              <p className="text-xs text-gray-500">Identity verification required</p>
            </div>
          </div>
          {step !== "processing" && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Step 1: Document Input */}
        {step === "input" && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Aadhaar */}
            <div>
              <label className="text-sm font-medium text-gray-900 mb-1.5 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-gray-500" />
                Aadhaar Number
              </label>
              <Input
                value={formatAadhaar(aadhaar)}
                onChange={handleAadhaarChange}
                placeholder="1234 5678 9012"
                maxLength={14}
                className={`rounded-xl text-lg tracking-wider ${formErrors.aadhaar ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {formErrors.aadhaar && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {formErrors.aadhaar}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{aadhaar.length}/12 digits</p>
            </div>

            {/* PAN */}
            <div>
              <label className="text-sm font-medium text-gray-900 mb-1.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                PAN Number
              </label>
              <Input
                value={pan}
                onChange={handlePanChange}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={`rounded-xl text-lg tracking-wider uppercase ${formErrors.pan ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {formErrors.pan && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {formErrors.pan}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">Format: 5 letters, 4 digits, 1 letter</p>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-gray-900 mb-1.5 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">+91</span>
                <Input
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`rounded-xl ${formErrors.phone ? "border-red-400 focus:ring-red-400" : ""}`}
                />
              </div>
              {formErrors.phone && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {formErrors.phone}
                </p>
              )}
            </div>

            {/* Consent */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => {
                    setAgreed(e.target.checked);
                    if (formErrors.agreed) setFormErrors(prev => ({ ...prev, agreed: "" }));
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF] mt-0.5 flex-shrink-0"
                />
                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                  By submitting, I agree to the identity verification terms and consent to my Aadhaar and PAN details being verified through authorized government APIs.
                </span>
              </label>
              {formErrors.agreed && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 ml-7">
                  <AlertTriangle className="w-3 h-3" /> {formErrors.agreed}
                </p>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full gap-2 bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90 h-12 text-base"
            >
              Verify Identity
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-xs text-center text-gray-400">
              Your data is encrypted and processed securely. We do not store raw Aadhaar or PAN numbers.
            </p>
          </div>
        )}

        {/* Step 2: Processing Animation */}
        {step === "processing" && (
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Verifying Your Identity</h3>
              <p className="text-sm text-gray-500 mt-1">Please wait while we verify your documents...</p>
            </div>

            <div className="space-y-3">
              {verificationSteps.map((vs, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    vs.status === "active" ? "bg-blue-50 border border-blue-200" :
                    vs.status === "done" ? "bg-emerald-50 border border-emerald-200" :
                    "bg-gray-50 border border-gray-100"
                  }`}
                >
                  {vs.status === "active" ? (
                    <Loader2 className="w-5 h-5 text-[#0E61FF] animate-spin flex-shrink-0" />
                  ) : vs.status === "done" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    vs.status === "active" ? "text-[#0E61FF] font-medium" :
                    vs.status === "done" ? "text-emerald-700" :
                    "text-gray-400"
                  }`}>
                    {vs.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && result && (
          <div className="p-4 sm:p-6 text-center">
            {result.success ? (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Identity Verified Successfully</h3>
                <p className="text-gray-500 mb-2">
                  Your KYC verification is complete. You can now access all platform features.
                </p>
                <div className="flex items-center justify-center gap-2 text-emerald-600 mb-6">
                  <PartyPopper className="w-5 h-5" />
                  <span className="text-sm font-medium">Welcome to QuickConnects!</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h3>
                <p className="text-gray-500 mb-2">{result.error || "Please check your details and try again."}</p>
                <Button
                  onClick={() => {
                    setStep("input");
                    setResult(null);
                    apiCalled.current = false;
                    setVerificationSteps(prev =>
                      prev.map(s => ({ ...s, status: "pending" as const }))
                    );
                  }}
                  variant="outline"
                  className="mb-4 gap-2"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Try Again
                </Button>
              </>
            )}

            <Button
              onClick={onClose}
              className="w-full gap-2 bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90 h-12 text-base"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Waiting for API (result screen but no result yet) */}
        {step === "result" && !result && (
          <div className="p-4 sm:p-6 text-center">
            <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Finalizing verification...</p>
          </div>
        )}
      </div>
    </div>
  );
}
