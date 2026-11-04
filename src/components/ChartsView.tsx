'use client';

import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { SpendAnalytics } from '@/types';

interface ChartsViewProps {
  analytics: SpendAnalytics;
}

export const ChartsView: React.FC<ChartsViewProps> = ({ analytics }) => {
  return (
    <div className="bg-[#111215] border border-[#23252a] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#23252a]">
        <div>
          <h3 className="text-sm font-semibold text-white">30-Day Outflow Projection</h3>
          <p className="text-xs text-[#8c9099]">Scheduled renewal cliffs across active billing agreements</p>
        </div>
        <div className="text-xs font-mono text-[#8c9099]">
          Peak Outflow: <span className="text-white font-semibold">${analytics.monthlyTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={analytics.cashFlowForecast}>
            <defs>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#5e626b" fontSize={11} tickLine={false} />
            <YAxis stroke="#5e626b" fontSize={11} tickFormatter={(v) => `$${v}`} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#111215', 
                borderColor: '#23252a', 
                borderRadius: '6px', 
                fontSize: '12px',
                color: '#f2f3f5' 
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="cumulativeOutflow" 
              stroke="#2563eb" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#outflowGrad)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
