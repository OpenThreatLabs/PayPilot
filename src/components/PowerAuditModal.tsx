'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  AllCommunityModule, 
  ModuleRegistry, 
  ColDef,
  ICellRendererParams,
  themeQuartz,
  colorSchemeDark
} from 'ag-grid-community';
import { Subscription } from '@/types';
import { X, Download, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

ModuleRegistry.registerModules([AllCommunityModule]);

interface PowerAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  currencySymbol?: string;
}

export function PowerAuditModal({
  isOpen,
  onClose,
  subscriptions,
  currencySymbol = '$',
}: PowerAuditModalProps) {
  const [quickFilterText, setQuickFilterText] = useState('');

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const columnDefs = useMemo<ColDef<Subscription>[]>(() => [
    {
      headerName: 'Service',
      field: 'name',
      flex: 2,
      minWidth: 170,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        return (
          <div className="flex flex-col justify-center h-full">
            <span className="font-medium text-white leading-tight">{params.data.name}</span>
            <span className="text-[11px] text-[#86868b]">{params.data.vendor}</span>
          </div>
        );
      },
    },
    {
      headerName: 'Tier / Plan',
      field: 'planName',
      flex: 1.5,
      minWidth: 140,
      cellClass: 'text-xs text-[#86868b] flex items-center',
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
      minWidth: 90,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center h-full font-mono text-xs font-medium text-white tabular-nums">
            {currencySymbol}{params.data.amount.toFixed(2)}
          </div>
        );
      },
    },
    {
      headerName: 'Cycle',
      field: 'billingCycle',
      flex: 1,
      minWidth: 90,
      cellClass: 'text-xs text-[#86868b] capitalize flex items-center',
      valueFormatter: (params) => (params.value || '').toLowerCase(),
    },
    {
      headerName: 'PayPal Agreement ID',
      field: 'paypalAgreementId',
      flex: 1.6,
      minWidth: 150,
      cellClass: 'text-xs text-[#86868b] font-mono flex items-center',
    },
    {
      headerName: 'Usage Index',
      field: 'usageScore',
      flex: 1.1,
      minWidth: 110,
      cellRenderer: (params: ICellRendererParams<Subscription>) => {
        if (!params.data) return null;
        const score = params.data.usageScore;
        return (
          <div className="flex items-center gap-2 h-full">
            <div className="w-12 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  score >= 70 ? 'bg-[#30d158]' : score >= 40 ? 'bg-[#0071e3]' : 'bg-[#ff9f0a]'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[#86868b] tabular-nums">{score}%</span>
          </div>
        );
      },
    },
    {
      headerName: 'Next Billing',
      field: 'nextBillingDate',
      flex: 1.2,
      minWidth: 110,
      cellClass: 'text-xs text-[#86868b] font-mono flex items-center',
      valueFormatter: (params) => {
        if (!params.value) return '—';
        return params.value.slice(0, 10);
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      flex: 1,
      minWidth: 90,
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
  ], [currencySymbol]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const handleExportCSV = () => {
    const headers = ['Name', 'Vendor', 'Plan', 'Category', 'Rate', 'Cycle', 'Agreement ID', 'Usage Score', 'Next Billing Date', 'Status'];
    const rows = subscriptions.map((s) => [
      `"${s.name}"`,
      `"${s.vendor}"`,
      `"${s.planName}"`,
      `"${s.category}"`,
      s.amount.toFixed(2),
      `"${s.billingCycle}"`,
      `"${s.paypalAgreementId}"`,
      s.usageScore,
      `"${s.nextBillingDate}"`,
      `"${s.status}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayPilot_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Financial ledger exported to CSV');
  };

  const darkTheme = useMemo(() => {
    return themeQuartz.withPart(colorSchemeDark).withParams({
      backgroundColor: '#16171b',
      foregroundColor: '#f5f5f7',
      headerBackgroundColor: '#121316',
      headerTextColor: '#86868b',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      rowHoverColor: 'rgba(255, 255, 255, 0.04)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      fontSize: 12,
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-[#f5f5f7] p-6 sm:p-10 select-none backdrop-blur-2xl"
    >
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white shadow-inner">
              <ShieldCheck className="w-6 h-6 text-[#0071e3]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="power-audit-title" className="text-xl font-semibold tracking-tight text-white">
                  Financial Ledger & Audit
                </h2>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[#86868b] border border-white/[0.1]">
                  AG Grid v33 Engine
                </span>
              </div>
              <p className="text-xs text-[#86868b] mt-0.5">
                Full-screen institutional audit view synchronized with live PayPal billing agreements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium transition-all active:scale-[0.96] flex items-center gap-2 border border-white/[0.08]"
            >
              <Download className="w-4 h-4 text-[#86868b]" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#86868b] hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 border border-white/[0.08]"
            >
              <X className="w-4 h-4" />
              <span>Close (Esc)</span>
            </button>
          </div>
        </div>

        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-[#86868b]">
            Click column headers to sort • Drag column dividers to resize • Real-time client filter
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              placeholder="Search ledger records..."
              className="bg-[#1c1c1e] border border-white/[0.1] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#86868b] focus:outline-none focus:border-white/[0.3] transition-colors w-full sm:w-72"
            />
          </div>
        </div>

        <div className="flex-1 w-full rounded-2xl overflow-hidden border border-white/[0.1] bg-[#16171b] shadow-2xl relative min-h-[450px]">
          <div className="absolute inset-0">
            <AgGridReact
              theme={darkTheme}
              rowData={subscriptions}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilterText}
              rowHeight={50}
              headerHeight={42}
              onGridReady={(params) => {
                setTimeout(() => {
                  params.api.sizeColumnsToFit();
                }, 100);
              }}
            />
          </div>
        </div>

        <div className="pt-4 mt-2 flex items-center justify-between text-xs text-[#86868b]">
          <span>{subscriptions.length} active recurring agreements</span>
          <span className="font-mono text-[11px]">PayPal Subscriptions REST v1 • On-Device Encrypted</span>
        </div>
      </div>
    </div>
  );
}
