import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function MaintenanceNotice() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Automatically hide the notice after 60 seconds (60000 ms)
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 60000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-0 right-0 z-[9999] px-4 pointer-events-none flex justify-center"
        >
          <div className="bg-[#ff6b35]/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 max-w-2xl w-full pointer-events-auto border border-white/20">
            <div className="bg-white/20 p-2 rounded-full shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium leading-snug flex-1">
              <strong className="font-bold">Maintenance Notice:</strong> We are currently updating our UI/UX and migrating our servers/providers. The site is still fully usable during this time!
            </p>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
