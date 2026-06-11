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

// A simple global cache to track URLs that have already loaded successfully in this session.
// This prevents "flickering" or "re-fading" when components re-render or remount during scrolling.
const LOADED_IMAGES_CACHE = new Set<string>();

export default function LazyImage({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  onLoadComplete,
  ...props
}: LazyImageProps) {
  const isAlreadyLoaded = LOADED_IMAGES_CACHE.has(src);
  const [shouldLoad, setShouldLoad] = useState(isAlreadyLoaded);
  const [isLoaded, setIsLoaded] = useState(isAlreadyLoaded);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset loaded status ONLY if src changes to a completely different URL
  const prevSrcRef = useRef<string>(src);
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      if (src && !LOADED_IMAGES_CACHE.has(src)) {
        setIsLoaded(false);
      } else if (LOADED_IMAGES_CACHE.has(src)) {
        setIsLoaded(true);
        setShouldLoad(true);
      }
      prevSrcRef.current = src;
    }
  }, [src]);

  useEffect(() => {
    // If already loaded in cache or intersection not supported, skip observer
    if (isAlreadyLoaded || typeof window === "undefined" || !("IntersectionObserver" in window)) {
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
        // Aggressive pre-loading to ensure smooth high-speed scrolling
        rootMargin: "800px 0px 800px 0px",
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
      {/* Lightweight shimmering skeleton placeholder - fades out when loaded */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r from-white/[0.01] via-white/[0.04] to-white/[0.01] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] pointer-events-none transition-opacity duration-300 ease-out z-10 ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`} 
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.01) 100%)",
          backgroundSize: "200% 100%"
        }}
        aria-hidden="true"
      />

      {/* The actual image */}
      {shouldLoad && src && (
        <img
          src={src}
          alt={alt}
          onLoad={() => {
            setIsLoaded(true);
            if (src) LOADED_IMAGES_CACHE.add(src);
            if (onLoadComplete) onLoadComplete();
          }}
          className={`transition-opacity duration-500 ease-out z-0 relative ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}
