'use client';

import React from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  CreditCard, 
  ShieldAlert, 
  Calendar, 
  Tag 
} from 'lucide-react';

export type NavTab = 'DASHBOARD' | 'SUBSCRIPTIONS' | 'VIGIL';

interface LeftSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal?: () => void;
  collapsed: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
  collapsed,
}) => {
  const navItems = [
    { id: 'DASHBOARD' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'SUBSCRIPTIONS' as NavTab, label: 'Subscriptions', icon: CreditCard },
    { id: 'VIGIL' as NavTab, label: 'Vigil', icon: ShieldAlert },
  ];

  return (
    <aside
      className={`h-[calc(100vh-4rem)] sticky top-16 left-0 border-r border-white/[0.04] bg-transparent flex flex-col justify-between p-4 select-none shrink-0 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        collapsed ? 'w-22 items-center px-3' : 'w-72'
      }`}
    >
      <div className="space-y-4 w-full">
        <button
          type="button"
          onClick={onOpenAddModal}
          title={collapsed ? 'Track Service' : undefined}
          className={`w-full apple-primary-btn py-3 text-sm font-semibold flex items-center justify-center gap-2 select-none shadow-lg shadow-[#0071e3]/20 ${
            collapsed ? 'px-0 rounded-full h-12 w-12 mx-auto' : 'px-4'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {!collapsed && <span>Track Service</span>}
        </button>

        <nav className="space-y-1.5 w-full pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3.5 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold shadow-xs'
                    : 'text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.04]'
                } ${collapsed ? 'justify-center px-0 h-11 w-11 mx-auto' : 'px-4'}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2997ff]' : 'text-[#86868b]'}`} />
                {!collapsed && <span className="truncate text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
