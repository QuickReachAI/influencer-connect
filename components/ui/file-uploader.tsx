"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  X,
  CheckCircle,
  AlertTriangle,
  Pause,
  Play,
  FileVideo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  accept?: string;
  maxSize?: number;
  onUploadComplete?: (fileUrl: string) => void;
  className?: string;
}

type UploadState = "idle" | "selected" | "uploading" | "paused" | "complete" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function FileUploader({
  accept,
  maxSize = 500,
  onUploadComplete,
  className,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearUploadInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => clearUploadInterval();
  }, []);

  function validateAndSet(selected: File) {
    setError(null);
    if (selected.size > maxSize * 1024 * 1024) {
      setError(`File exceeds ${maxSize}MB limit`);
      setState("error");
      setFile(selected);
      return;
    }
    setFile(selected);
    setState("selected");
  }

  function startUpload() {
    if (!file) return;
    setState("uploading");
    setProgress(0);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearUploadInterval();
          setState("complete");
          onUploadComplete?.(`/uploads/${file.name}`);
          return 100;
        }
        return prev + 100 / 30;
      });
    }, 100);
  }

  function pauseUpload() {
    clearUploadInterval();
    setState("paused");
  }

  function resumeUpload() {
    setState("uploading");
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearUploadInterval();
          setState("complete");
          onUploadComplete?.(`/uploads/${file?.name}`);
          return 100;
        }
        return prev + 100 / 30;
      });
    }, 100);
  }

  function reset() {
    clearUploadInterval();
    setFile(null);
    setState("idle");
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) validateAndSet(dropped);
    },
    [maxSize],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) validateAndSet(selected);
    },
    [maxSize],
  );

  if (state === "complete") {
    return (
      <Card className={cn("border-emerald-200 bg-emerald-50", className)}>
        <CardContent className="flex items-center gap-4 p-6">
          <CheckCircle className="h-8 w-8 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{file?.name}</p>
            <p className="text-sm text-emerald-600">Upload complete</p>
          </div>
          <Button variant="ghost" size="icon" onClick={reset}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (file && (state === "selected" || state === "uploading" || state === "paused" || state === "error")) {
    return (
      <Card className={cn(error ? "border-red-200" : "", className)}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              {isVideoFile(file) ? (
                <FileVideo className="h-5 w-5 text-[#0E61FF]" />
              ) : (
                <Upload className="h-5 w-5 text-gray-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>

              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              {(state === "uploading" || state === "paused") && (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#0E61FF] transition-[width] duration-150"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {Math.min(Math.round(progress), 100)}%
                    {state === "paused" && " — Paused"}
                  </p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {state === "selected" && (
                <Button size="sm" onClick={startUpload}>
                  Upload
                </Button>
              )}

              {state === "uploading" && (
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={pauseUpload}>
                  <Pause className="h-4 w-4" />
                </Button>
              )}

              {state === "paused" && (
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={resumeUpload}>
                  <Play className="h-4 w-4" />
                </Button>
              )}

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
        isDragOver
          ? "border-[#0E61FF] bg-blue-50"
          : "border-gray-300 bg-white hover:border-[#0E61FF]/50 hover:bg-gray-50",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <Upload className="h-5 w-5 text-gray-500" />
      </div>
      <div className="text-center">
        <p className="font-medium text-gray-900">
          Drop your file here or{" "}
          <span className="text-[#0E61FF]">browse</span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Max file size: {maxSize}MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
