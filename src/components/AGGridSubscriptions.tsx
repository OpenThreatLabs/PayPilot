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
import { Search } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

interface AGGridSubscriptionsProps {
  subscriptions: Subscription[];
  onActionClick: (sub: Subscription, actionType: 'CANCEL' | 'SUSPEND') => void;
  loadingId?: string | null;
}

export const AGGridSubscriptions: React.FC<AGGridSubscriptionsProps> = ({
  subscriptions,
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
              {sub.priceCreepRisk && (
                <span className="text-[10px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 px-1 py-0.2 rounded font-mono">
                  +{sub.priceCreepRisk.percentIncrease}%
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#8c9099] mt-0.5">
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
      cellClass: 'text-xs text-[#8c9099] flex items-center font-mono',
    },
    {
      headerName: 'Rate',
      field: 'amount',
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center h-full font-mono text-sm font-medium text-white">
            ${params.data.amount.toFixed(2)}
            <span className="text-[11px] text-[#5e626b] ml-1">/mo</span>
          </div>
        );
      },
    },
    {
      headerName: 'Agreement ID',
      field: 'paypalAgreementId',
      flex: 1.3,
      minWidth: 130,
      cellClass: 'text-xs text-[#5e626b] font-mono flex items-center',
    },
    {
      headerName: 'Usage',
      field: 'usageScore',
      flex: 1.1,
      minWidth: 110,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        const score = params.data.usageScore;
        const isLow = score < 30;
        return (
          <div className="flex items-center gap-2 h-full">
            <div className="w-12 h-1.5 bg-[#23252a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  score > 60 ? 'bg-[#22c55e]' : score > 30 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={`text-xs font-mono ${isLow ? 'text-[#ef4444] font-medium' : 'text-[#8c9099]'}`}>
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
            {status === 'ACTIVE' && (
              <span className="text-[11px] text-[#22c55e] font-mono">Active</span>
            )}
            {status === 'SUSPENDED' && (
              <span className="text-[11px] text-[#f59e0b] font-mono">Suspended</span>
            )}
            {status === 'CANCELLED' && (
              <span className="text-[11px] text-[#5e626b] font-mono">Terminated</span>
            )}
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

        if (sub.status !== 'ACTIVE') {
          return (
            <div className="flex items-center h-full text-xs text-[#5e626b]">
              Closed
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 h-full">
            <button
              disabled={isWorking}
              onClick={() => onActionClick(sub, 'SUSPEND')}
              className="px-2.5 py-1 text-xs font-medium text-[#8c9099] hover:text-white bg-[#17181c] hover:bg-[#23252a] border border-[#23252a] rounded transition-colors disabled:opacity-40"
            >
              Pause
            </button>
            <button
              disabled={isWorking}
              onClick={() => onActionClick(sub, 'CANCEL')}
              className="px-2.5 py-1 text-xs font-medium text-[#ef4444] hover:text-[#f87171] bg-[#17181c] hover:bg-[#23252a] border border-[#23252a] rounded transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        );
      },
    },
  ], [loadingId, onActionClick]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="bg-[#111215] border border-[#23252a] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#23252a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c0d0f]">
        <div>
          <h3 className="text-sm font-semibold text-white">Active Commitments & Agreements</h3>
          <p className="text-xs text-[#8c9099]">Real-time synchronization with PayPal Sandbox API</p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5e626b]" />
          <input
            type="text"
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            placeholder="Search agreements..."
            className="pl-8 pr-3 py-1 bg-[#17181c] border border-[#23252a] rounded text-xs text-white placeholder-[#5e626b] focus:outline-none focus:border-[#38bdf8] w-full sm:w-56"
          />
        </div>
      </div>

      <div className="ag-theme-alpine-dark w-full h-[380px]">
        <AgGridReact
          rowData={subscriptions}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          rowHeight={48}
          headerHeight={36}
        />
      </div>

      <div className="px-5 py-2.5 border-t border-[#23252a] bg-[#0c0d0f] flex items-center justify-between text-xs text-[#5e626b]">
        <span>PayPal Subscriptions REST v1</span>
        <span>{subscriptions.length} active records</span>
      </div>
    </div>
  );
};
