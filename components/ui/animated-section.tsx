"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: string;
  delay?: number;
  threshold?: number;
  as?: string;
}

export function AnimatedSection({
  children,
  className = "",
  animation = "animate-slide-up",
  delay = 0,
  threshold = 0.15,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? animation : "opacity-0 translate-y-4"}`}
      style={{
        transition: isVisible ? undefined : "none",
        animationDelay: isVisible && delay ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
