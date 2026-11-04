'use client';

import React from 'react';
import { AuditRecommendation } from '@/types';
import { ArrowRight } from 'lucide-react';

interface AuditDrawerProps {
  recommendations: AuditRecommendation[];
  onExecuteRecommendation: (rec: AuditRecommendation) => void;
  loadingId?: string | null;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({
  recommendations,
  onExecuteRecommendation,
  loadingId,
}) => {
  if (recommendations.length === 0) {
    return (
      <div className="bg-[#111215] border border-[#23252a] rounded-lg p-5 text-center">
        <h4 className="text-white font-medium text-xs">Portfolio Optimized</h4>
        <p className="text-xs text-[#8c9099] mt-0.5">
          Zero zombie expenses or duplicate redundancies detected in your PayPal billing pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111215] border border-[#23252a] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#23252a]">
        <div>
          <h3 className="text-sm font-semibold text-white">Prune & Redundancy Recommendations</h3>
          <p className="text-xs text-[#8c9099]">Algorithmic detection of overlapping capabilities and price creep</p>
        </div>
        <span className="text-xs font-mono text-[#8c9099]">
          {recommendations.length} action items
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recommendations.map((rec) => {
          const isWorking = loadingId === rec.id;

          return (
            <div 
              key={rec.id}
              className="bg-[#17181c] border border-[#23252a] rounded p-3.5 flex flex-col justify-between hover:border-[#32353d] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[11px] font-mono text-[#8c9099]">
                    {rec.type.replace('_', ' ')}
                  </span>
                  <span className="text-[#22c55e] font-mono font-medium">
                    +${(rec.potentialMonthlySavings * 12).toFixed(0)}/yr
                  </span>
                </div>

                <h4 className="text-xs font-medium text-white mb-1">{rec.title}</h4>
                <p className="text-xs text-[#8c9099] leading-relaxed mb-3">{rec.description}</p>
              </div>

              <div className="pt-2.5 border-t border-[#23252a] flex items-center justify-between">
                <span className="text-[11px] text-[#5e626b] font-mono">
                  {rec.suggestedAction} agreement
                </span>

                <button
                  disabled={isWorking}
                  onClick={() => onExecuteRecommendation(rec)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#23252a] hover:bg-[#32353d] disabled:opacity-40 rounded transition-colors"
                >
                  <span>{isWorking ? 'Executing...' : 'Resolve via PayPal'}</span>
                  <ArrowRight className="w-3 h-3 text-[#8c9099]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
