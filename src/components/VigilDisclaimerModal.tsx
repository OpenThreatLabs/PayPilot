'use client';

import React, { useEffect, useState } from 'react';

interface VigilDisclaimerModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
  onCancel?: () => void;
}

export function VigilDisclaimerModal({
  isOpen,
  onAcknowledge,
  onCancel,
}: VigilDisclaimerModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && onCancel) {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      const t = setTimeout(() => setMounted(false), 240);
      return () => clearTimeout(t);
    }
  }, [isOpen, onCancel]);

  if (!mounted && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ease-out ${
        isOpen
          ? 'bg-black/60 backdrop-blur-md opacity-100'
          : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
      }`}
      style={{ WebkitBackdropFilter: isOpen ? 'blur(20px)' : 'none' }}
      onClick={() => onCancel && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vigil-disclaimer-title"
        className={`w-full max-w-[460px] rounded-[24px] bg-[#1c1c1e]/90 border border-white/[0.12] shadow-2xl p-6 text-[#f5f5f7] transform transition-all duration-200 ease-out select-none ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-[0.96] opacity-0 translate-y-2'
        }`}
        style={{
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shadow-inner">
            <svg
              className="w-7 h-7 text-[#0071e3]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <div className="space-y-1">
            <h2
              id="vigil-disclaimer-title"
              className="text-[20px] font-semibold tracking-tight text-white"
            >
              About Vigil
            </h2>
            <p className="text-[13px] text-[#86868b] leading-snug">
              Autonomous Financial Intelligence & Actions
            </p>
          </div>
        </div>

        <div className="my-5 space-y-3 text-[13px] text-[#a1a1a6] leading-relaxed border-y border-white/[0.08] py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="font-medium text-white block">Autonomous Execution</span>
              Vigil monitors recurring commitments and initiates PayPal billing cancellations or suspensions on your behalf.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-[#ff9f0a]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="font-medium text-white block">Irreversible Operations</span>
              Cancellations through PayPal live billing agreements cannot be reversed automatically; you will need to re-subscribe manually.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-[#30d158]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="font-medium text-white block">Explicit Authorization</span>
              Destructive actions are staged in safe pending state and require your explicit one-tap confirmation before execution.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={onAcknowledge}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium tracking-tight transition-all duration-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 shadow-md"
          >
            I Understand & Accept
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-white/[0.05] text-[#86868b] hover:text-[#f5f5f7] text-[13px] font-medium transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
