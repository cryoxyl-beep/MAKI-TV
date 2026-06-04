/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  onLoadComplete?: () => void;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

export default function LazyImage({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  onLoadComplete,
  ...props
}: LazyImageProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // If IntersectionObserver is not supported, load immediately as fallback
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        // Start loading when 250px before entering the viewport to prevent pop-in
        rootMargin: "250px 0px 250px 0px",
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full h-full bg-[#15151c]/40 ${wrapperClassName}`}
    >
      {/* Lightweight shimmering skeleton placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] via-white/[0.04] to-white/[0.01] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] pointer-events-none" 
          style={{
            backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.01) 100%)",
            backgroundSize: "200% 100%"
          }}
        />
      )}

      {/* The actual image */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          onLoad={() => {
            setIsLoaded(true);
            if (onLoadComplete) onLoadComplete();
          }}
          className={`transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}
