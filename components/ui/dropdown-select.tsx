"use client";

import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Single Select ───
interface SingleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function SingleSelect({ value, onChange, options, placeholder = "Select...", className }: SingleSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-left hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF] transition-colors"
      >
        <span className={value ? "text-gray-900 truncate" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 sm:max-h-72 overflow-y-auto py-1">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-2.5 min-h-[44px] text-sm hover:bg-gray-50 transition-colors flex items-center justify-between",
                value === opt && "bg-blue-50 text-[#0E61FF] font-medium"
              )}
            >
              {opt}
              {value === opt && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Multi Select ───
interface MultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  maxSelections?: number;
  className?: string;
  showBadges?: boolean;
}

export function MultiSelect({ values, onChange, options, placeholder = "Select...", maxSelections, className, showBadges = true }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter(v => v !== opt));
    } else {
      if (maxSelections && values.length >= maxSelections) return;
      onChange([...values, opt]);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-left hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF] transition-colors"
      >
        <span className={cn("truncate", values.length > 0 ? "text-gray-900" : "text-gray-400")}>
          {values.length > 0 ? values.join(", ") : placeholder}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {values.length > 0 && (
            <span className="text-xs text-gray-400 font-medium">{values.length}</span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 sm:max-h-72 overflow-y-auto py-1">
          {options.map(opt => {
            const selected = values.includes(opt);
            const disabled = !selected && maxSelections !== undefined && values.length >= maxSelections;
            return (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 min-h-[44px] hover:bg-gray-50 cursor-pointer text-sm transition-colors",
                  selected && "bg-blue-50",
                  disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => !disabled && toggle(opt)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF]"
                />
                <span className={cn("text-gray-700", selected && "text-[#0E61FF] font-medium")}>{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {showBadges && values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {values.map(v => (
            <Badge key={v} variant="info" className="gap-1">
              {v}
              <button type="button" onClick={() => toggle(v)} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
