"use client";

import React, { useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { FranchiseSwitcher, SwitchedViewBanner } from "@/components/dashboard/FranchiseSwitcher";
import { DashboardTabBar } from "@/components/dashboard/DashboardTabBar";

import { ContactsTab } from "@/components/dashboard/tabs/ContactsTab";
import { PaymentsTab } from "@/components/dashboard/tabs/PaymentsTab";
import { TransactionsTab } from "@/components/dashboard/tabs/TransactionsTab";
import { PlansTab } from "@/components/dashboard/tabs/PlansTab";
import { AnalyticsTab } from "@/components/dashboard/tabs/AnalyticsTab";
import { OrdersTab } from "@/components/dashboard/tabs/OrdersTab";
import { FranchisesTab } from "@/components/dashboard/tabs/FranchisesTab";
import { MembersTab } from "@/components/dashboard/tabs/MembersTab";

import { Building2, Store, ShieldCheck, MapPin, Phone, Globe } from "lucide-react";

export default function BusinessDashboardPage() {
  const { activeBusinessData, isSwitchedView, isHQView } = useBusiness();
  const [activeTab, setActiveTab] = useState("contacts");

  return (
    <div className="space-y-6 pb-12">
      {/* Context Switched View Amber Alert Banner */}
      <SwitchedViewBanner />

      {/* Top Header Card with Context Switcher & Workspace Metadata */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-[#E5E0D8] dark:border-white/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-sm ${
              isSwitchedView
                ? "bg-amber-500 text-white"
                : "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
            }`}
          >
            {isSwitchedView ? <Store className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight">
                {activeBusinessData?.name || "Business Command Dashboard"}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isSwitchedView
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                }`}
              >
                {isSwitchedView ? "Scoped Franchise Outlet" : "HQ Central Workspace"}
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                {activeBusinessData?.city || "Mumbai, MH"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                {activeBusinessData?.phone || "+91 98765 43210"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Multi-Tenant Active
              </span>
            </p>
          </div>
        </div>

        {/* Top Header Interactive Franchise Switcher */}
        <div className="shrink-0 w-full sm:w-auto flex justify-end">
          <FranchiseSwitcher />
        </div>
      </div>

      {/* Adaptive Desktop & Horizontal Scroll-Protected Mobile Tab Bar */}
      <DashboardTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Dynamic Tab Workspace View */}
      <div className="pt-2">
        {activeTab === "contacts" && <ContactsTab />}
        {activeTab === "payments" && <PaymentsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "plans" && <PlansTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "franchises" && <FranchisesTab />}
        {activeTab === "members" && <MembersTab />}
      </div>
    </div>
  );
}
