"use client";

import React, { useMemo } from "react";
import { useBusiness } from "@/context/BusinessContext";
import {
  Users,
  CreditCard,
  Receipt,
  Layers,
  BarChart3,
  ShoppingBag,
  Building2,
  UserCheck,
} from "lucide-react";

export const TAB_DEFINITIONS = [
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    permissionKey: "canManageContacts",
    badge: "Inbox",
    requiresHQ: false,
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    permissionKey: "canManagePayments",
    badge: "Razorpay",
    requiresHQ: false,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Receipt,
    permissionKey: "canManageTransactions",
    badge: "Ledger",
    requiresHQ: false,
  },
  {
    id: "plans",
    label: "Plans",
    icon: Layers,
    permissionKey: "canManagePlans",
    badge: "Billing",
    requiresHQ: false,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    permissionKey: "canViewAnalytics",
    badge: "360°",
    requiresHQ: false,
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingBag,
    permissionKey: "canManageOrders",
    badge: "Realtime",
    requiresHQ: false,
  },
  {
    id: "franchises",
    label: "Franchises",
    icon: Building2,
    permissionKey: "canManageMembers",
    badge: "HQ Only",
    requiresHQ: true, // Strictly restricted to HQ central view
  },
  {
    id: "members",
    label: "Members",
    icon: UserCheck,
    permissionKey: "canManageMembers",
    badge: "Directory",
    requiresHQ: false,
  },
];

export function DashboardTabBar({ activeTab, onSelectTab }) {
  const { permissions, isHQView } = useBusiness();

  // Filter visible tabs based on RBAC permissions and HQ view status
  const visibleTabs = useMemo(() => {
    return TAB_DEFINITIONS.filter((tab) => {
      // 1. Check HQ restriction requirement
      if (tab.requiresHQ && !isHQView) {
        return false;
      }
      // 2. Check RBAC permissions flag
      if (tab.permissionKey && permissions && permissions[tab.permissionKey] === false) {
        return false;
      }
      return true;
    });
  }, [permissions, isHQView]);

  return (
    <div className="w-full bg-white dark:bg-[#1A1A1A] border-b border-[#E5E0D8] dark:border-white/10 sticky top-16 z-20 shadow-xs">
      {/* Scroll-Protected Bar Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2.5 scroll-smooth">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-md scale-102"
                    : "text-gray-600 dark:text-gray-400 hover:bg-[#F2EFE9] dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400 dark:text-amber-600" : "opacity-70"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
