import React, { useRef, useEffect } from "react";

interface ShelfScrollerProps {
  children: React.ReactNode;
}

export default function ShelfScroller({ children }: ShelfScrollerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isDraggingMoused = useRef(false);

  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    
    let frameId: number | null = null;
    let momentumRafId: number | null = null;

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const handlePointerDown = (e: PointerEvent) => {
      // We only handle standard left-click mouse drags.
      // Touch devices use native scrolling (via CSS scroll-snap) which is already smooth.
      if (e.pointerType !== "mouse") return;
      
      // Prevent middle mouse wheel scroll state completely
      if (e.button === 1) {
        e.preventDefault();
        return;
      }
      
      // Only process left click
      if (e.button !== 0) return;

      // Cancel any ongoing physics animations instantly so the user catches the shelf
      if (momentumRafId) cancelAnimationFrame(momentumRafId);
      if (frameId) cancelAnimationFrame(frameId);

      isDragging = true;
      isDraggingMoused.current = false;
      startX = e.pageX;
      startScrollLeft = listEl.scrollLeft;

      lastX = e.pageX;
      lastTime = performance.now();
      velocity = 0;

      // Provide immediate visual feedback that it's grabbed
      // (Even if they haven't moved yet)
      listEl.style.cursor = "grabbing";
      listEl.style.scrollSnapType = "none";
      listEl.style.scrollBehavior = "auto";

      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      const walk = e.pageX - startX;
      
      // If the user has moved the mouse sufficiently, mark it as an actual drag
      // and disable pointer events on children so they don't fire hovers or clicks
      if (Math.abs(walk) > 3 && !isDraggingMoused.current) {
        isDraggingMoused.current = true;
        Array.from(listEl.children).forEach(child => {
          (child as HTMLElement).style.pointerEvents = "none";
        });
      }

      // If we haven't moved past the 3px threshold, don't drag yet
      if (!isDraggingMoused.current) return;
      
      const targetScroll = startScrollLeft - walk;

      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        listEl.scrollLeft = targetScroll;
      });

      // Calculate velocity for realistic momentum release
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        const currentVelocity = (e.pageX - lastX) / dt;
        // Moving average smooths out noisy mouse polling data
        velocity = velocity * 0.5 + currentVelocity * 0.5;
        lastX = e.pageX;
        lastTime = now;
      }
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      isDragging = false;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      listEl.style.cursor = "";
      if (frameId) cancelAnimationFrame(frameId);

      // Re-enable pointer events on inner items if we disabled them
      if (isDraggingMoused.current) {
        Array.from(listEl.children).forEach(child => {
          (child as HTMLElement).style.pointerEvents = "";
        });
      }

      // If they just clicked without dragging, restore snap and exit without momentum
      if (!isDraggingMoused.current) {
        listEl.style.scrollSnapType = "x mandatory";
        return;
      }

      // If the cursor stopped for a moment before release, kill momentum so it doesn't fly off unexpectedly
      const now = performance.now();
      if (now - lastTime > 100) {
        velocity = 0;
      }

      // Calculate predicted stop location based on release velocity
      const currentScroll = listEl.scrollLeft;
      const sweep = velocity * 180; // Momentum multiplier
      const estimatedTarget = currentScroll - sweep;

      let nearestPos = currentScroll;
      let minDiff = Infinity;
      const paddingLeft = parseInt(window.getComputedStyle(listEl).paddingLeft) || 0;

      // Find the closest anime card to our predicted stop location
      Array.from(listEl.children).forEach(child => {
        const el = child as HTMLElement;
        const targetScrollLeft = el.offsetLeft - paddingLeft;
        const diff = Math.abs(targetScrollLeft - estimatedTarget);
        
        if (diff < minDiff) {
          minDiff = diff;
          nearestPos = targetScrollLeft;
        }
      });

      // Clamp bounds against ends of the scroll area
      const maxScroll = listEl.scrollWidth - listEl.clientWidth;
      nearestPos = Math.max(0, Math.min(nearestPos, maxScroll));

      const startPos = currentScroll;
      const distance = nearestPos - startPos;

      // If distance is microscopically small, avoid useless animation
      if (Math.abs(distance) < 2) {
         listEl.style.scrollSnapType = "x mandatory";
         return;
      }

      // Dynamic animation duration based on distance to travel (Max 800ms)
      const duration = Math.min(Math.max(Math.abs(distance) / 1.5, 300), 800); 
      let startTime: number | null = null;

      // Frame-synced smooth scroll animation
      const animateToSnap = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const ease = easeOutQuart(progress);
        listEl.scrollLeft = startPos + distance * ease;
        
        if (progress < 1) {
          momentumRafId = requestAnimationFrame(animateToSnap);
        } else {
          // Finished animating, hand over to native CSS snap for bounds keeping
          listEl.style.scrollSnapType = "x mandatory";
        }
      };

      momentumRafId = requestAnimationFrame(animateToSnap);
    };

    listEl.addEventListener("pointerdown", handlePointerDown);

    return () => {
      listEl.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      if (frameId) cancelAnimationFrame(frameId);
      if (momentumRafId) cancelAnimationFrame(momentumRafId);
    };
  }, []);

  const handleCaptureClick = (e: React.MouseEvent) => {
    // Prevent navigating via card clicks if we actually dragged across the screen
    if (isDraggingMoused.current) {
      e.stopPropagation();
      e.preventDefault();
      setTimeout(() => {
        isDraggingMoused.current = false;
      }, 0);
    }
  };

  return (
    <div className="relative w-full select-none">
      <div
        ref={listRef}
        onClickCapture={handleCaptureClick}
        onDragStart={(e) => e.preventDefault()}
        className="flex overflow-x-auto gap-5 px-4 md:px-6 scroll-px-4 md:scroll-px-6 pb-6 pt-2 snap-x snap-mandatory cursor-grab relative group/row"
        style={{ 
          scrollbarWidth: "none", 
          WebkitUserSelect: "none", 
          userSelect: "none"
        }}
      >
        {children}
      </div>
    </div>
  );
}
