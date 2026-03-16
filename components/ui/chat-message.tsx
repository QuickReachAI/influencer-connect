"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  sender: "self" | "other" | "system";
  senderName: string;
  message: string;
  timestamp: string;
  isRedacted?: boolean;
  piiWarning?: string;
  isShadowBlocked?: boolean;
}

function renderMessage(text: string, isRedacted?: boolean) {
  if (!isRedacted) return text;

  const parts = text.split(/(\[REDACTED\])/g);
  return parts.map((part, i) =>
    part === "[REDACTED]" ? (
      <span
        key={i}
        className="inline-block rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-600"
      >
        [REDACTED]
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function ChatMessage({
  sender,
  senderName,
  message,
  timestamp,
  isRedacted = false,
  piiWarning,
  isShadowBlocked = false,
}: ChatMessageProps) {
  if (sender === "system") {
    return (
      <div className="flex justify-center px-4 py-2">
        <div className="w-full max-w-[90%] sm:max-w-lg rounded-xl bg-amber-50 px-4 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {renderMessage(message, isRedacted)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-amber-500">{timestamp}</p>
        </div>
      </div>
    );
  }

  const isSelf = sender === "self";

  return (
    <div
      className={cn("flex flex-col gap-1 px-3 sm:px-4 py-1.5", isSelf ? "items-end" : "items-start")}
    >
      <span className="text-xs font-medium text-gray-500">{senderName}</span>

      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[75%] break-words px-4 py-2.5 text-sm leading-relaxed",
          isSelf
            ? "rounded-2xl rounded-br-sm bg-[#0E61FF] text-white"
            : "rounded-2xl rounded-bl-sm bg-gray-100 text-gray-900",
        )}
      >
        {renderMessage(message, isRedacted)}
      </div>

      {piiWarning && (
        <div className="flex max-w-[75%] items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1">
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
          <span className="text-xs font-medium text-amber-600">{piiWarning}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400">{timestamp}</span>
        {isShadowBlocked && isSelf && (
          <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
            <EyeOff className="mr-0.5 h-2.5 w-2.5" />
            Not delivered
          </Badge>
        )}
      </div>
    </div>
  );
}
