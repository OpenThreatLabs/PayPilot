'use client';

import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  AllCommunityModule, 
  ModuleRegistry, 
  ColDef,
  ICellRendererParams 
} from 'ag-grid-community';
import { Subscription } from '@/types';
import { Search, Pause, X, Loader2 } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

interface AGGridSubscriptionsProps {
  subscriptions: Subscription[];
  currencySymbol?: string;
  onActionClick: (sub: Subscription, actionType: 'CANCEL' | 'SUSPEND') => void;
  loadingId?: string | null;
}

export const AGGridSubscriptions: React.FC<AGGridSubscriptionsProps> = ({
  subscriptions,
  currencySymbol = '$',
  onActionClick,
  loadingId,
}) => {
  const [quickFilterText, setQuickFilterText] = useState('');

  const columnDefs = useMemo<ColDef<Subscription>[]>(() => [
    {
      headerName: 'Service',
      field: 'name',
      flex: 2,
      minWidth: 190,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        const sub = params.data;
        return (
          <div className="flex flex-col justify-center h-full">
            <div className="font-medium text-white flex items-center gap-2 leading-tight">
              {sub.name}
              {sub.priceCreepRisk && sub.priceCreepRisk.percentIncrease > 0 && (
                <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1 py-0.2 rounded font-mono">
                  +{sub.priceCreepRisk.percentIncrease}%
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#86868b] mt-0.5">
              {sub.vendor} · {sub.planName}
            </div>
          </div>
        );
      },
    },
    {
      headerName: 'Category',
      field: 'category',
      flex: 1.2,
      minWidth: 120,
      valueFormatter: (params) => (params.value || '').replace('_', ' '),
      cellClass: 'text-xs text-[#86868b] flex items-center',
    },
    {
      headerName: 'Rate',
      field: 'amount',
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center h-full font-mono text-xs font-medium text-white tabular-nums">
            {currencySymbol}{params.data.amount.toFixed(2)}
            <span className="text-[11px] text-[#86868b] ml-1">/{params.data.billingCycle.toLowerCase()}</span>
          </div>
        );
      },
    },
    {
      headerName: 'Agreement ID',
      field: 'paypalAgreementId',
      flex: 1.3,
      minWidth: 130,
      cellClass: 'text-xs text-[#86868b] font-mono flex items-center',
    },
    {
      headerName: 'Usage',
      field: 'usageScore',
      flex: 1.1,
      minWidth: 110,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        const score = params.data.usageScore;
        return (
          <div className="flex items-center gap-2 h-full">
            <div className="w-14 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  score >= 70 ? 'bg-[#30d158]' : score >= 40 ? 'bg-[#0071e3]' : 'bg-[#ff9f0a]'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[#86868b] tabular-nums">
              {score}%
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        const status = params.data.status;
        return (
          <div className="flex items-center h-full">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                status === 'ACTIVE'
                  ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                  : status === 'SUSPENDED'
                  ? 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'
                  : 'bg-white/[0.05] text-[#86868b] border-white/[0.08]'
              }`}
            >
              {status}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Action',
      field: 'id',
      flex: 1.6,
      minWidth: 160,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        const sub = params.data;
        const isWorking = loadingId === sub.id;

        if (sub.status === 'CANCELLED') {
          return (
            <div className="flex items-center h-full text-xs text-[#86868b]">
              Cancelled
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 h-full">
            {sub.status === 'ACTIVE' && (
              <button
                disabled={isWorking}
                onClick={() => onActionClick(sub, 'SUSPEND')}
                className="px-2 py-1 text-[11px] font-medium text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-lg transition-all active:scale-[0.96] disabled:opacity-40 flex items-center gap-1"
              >
                {isWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                Pause
              </button>
            )}
            <button
              disabled={isWorking}
              onClick={() => onActionClick(sub, 'CANCEL')}
              className="px-2 py-1 text-[11px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all active:scale-[0.96] disabled:opacity-40 flex items-center gap-1"
            >
              {isWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Cancel
            </button>
          </div>
        );
      },
    },
  ], [currencySymbol, loadingId, onActionClick]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-xl">
      <div className="px-5 py-3 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02]">
        <div className="text-xs text-[#86868b]">
          Multi-column sorting and column resizing enabled
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
          <input
            type="text"
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            placeholder="Quick search grid..."
            className="pl-8 pr-3 py-1.5 bg-[#1c1c1e]/80 border border-white/[0.08] rounded-xl text-xs text-white placeholder-[#86868b] focus:outline-none focus:border-white/[0.2] transition-colors w-full sm:w-56"
          />
        </div>
      </div>

      <div className="ag-theme-alpine-dark w-full h-[460px]">
        <AgGridReact
          rowData={subscriptions}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          rowHeight={48}
          headerHeight={38}
        />
      </div>
    </div>
  );
};
