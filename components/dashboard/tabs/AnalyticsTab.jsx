"use client";

import React, { useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  DollarSign,
  Users,
  Building2,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";

export function AnalyticsTab() {
  const { franchises, isHQView } = useBusiness();
  const [subtab, setSubtab] = useState("income"); // 'income' | 'expenses'

  // Comparative Franchise Metrics
  const maxRevenue = Math.max(...franchises.map((f) => f.monthlyRevenue), 1);

  return (
    <div className="space-y-6">
      {/* Analytics Subtab Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" /> Multi-Dimensional Business Analytics
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time revenue velocity, MRR, ARPU, spending velocity, and multi-outlet benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F2EFE9] dark:bg-[#252525] p-1.5 rounded-2xl">
          <button
            onClick={() => setSubtab("income")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              subtab === "income"
                ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Income Analytics
          </button>
          <button
            onClick={() => setSubtab("expenses")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              subtab === "expenses"
                ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Expense Analytics
          </button>
        </div>
      </div>

      {subtab === "income" ? (
        <div className="space-y-6">
          {/* Income Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Monthly Recurring (MRR)
              </span>
              <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">₹8,45,000</p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                <ArrowUpRight className="w-3 h-3" /> +14.2% vs last month
              </span>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Avg Revenue Per User (ARPU)
              </span>
              <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">₹1,850</p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                <ArrowUpRight className="w-3 h-3" /> +5.8% subscription expansion
              </span>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Customer Lifetime Value (LTV)
              </span>
              <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">₹24,600</p>
              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5 mt-1">
                13.2 Months Avg Retention
              </span>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Gross Revenue Velocity
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹12.45L
              </p>
              <span className="text-[10px] text-gray-400 font-bold mt-1 block">
                Across all child outlets
              </span>
            </div>
          </div>

          {/* Revenue Velocity Chart & Multi-Franchise Benchmark */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SVG Line / Bar Velocity Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
                    Revenue Velocity Trend (6 Months)
                  </h3>
                  <p className="text-xs text-gray-500">Gross revenue collections vs projected growth target</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  +22% YoY
                </span>
              </div>

              {/* Clean Interactive SVG Bar Chart */}
              <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-gray-100 dark:border-white/10">
                {[
                  { month: "Mar", rev: 6.2, target: 6.0 },
                  { month: "Apr", rev: 7.8, target: 7.0 },
                  { month: "May", rev: 9.1, target: 8.5 },
                  { month: "Jun", rev: 8.4, target: 9.0 },
                  { month: "Jul", rev: 11.2, target: 10.0 },
                  { month: "Aug", rev: 12.45, target: 11.5 },
                ].map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full bg-gray-100 dark:bg-[#252525] rounded-xl h-full max-h-40 flex items-end p-1 relative">
                      <div
                        style={{ height: `${(item.rev / 14) * 100}%` }}
                        className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-lg transition-all duration-300 group-hover:bg-amber-600 shadow-xs"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">{item.month}</span>
                    <span className="text-[10px] font-extrabold text-[#1A1A1A] dark:text-white">
                      ₹{item.rev}L
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparative Multi-Franchise Revenue Performance */}
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-amber-500" /> Multi-Franchise Performance
                </h3>
                <p className="text-xs text-gray-500 mb-6">Comparative monthly revenue share</p>

                <div className="space-y-4">
                  {franchises.map((f) => {
                    const percentage = Math.round((f.monthlyRevenue / maxRevenue) * 100);
                    return (
                      <div key={f.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-[#1A1A1A] dark:text-white truncate max-w-[160px]">
                            {f.name}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            ₹{(f.monthlyRevenue / 100000).toFixed(2)}L
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#262626] h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/10 text-[11px] text-gray-500 font-semibold flex items-center justify-between">
                <span>Top Outlet: Indiranagar</span>
                <span className="text-emerald-600 font-extrabold">₹4.10L / mo</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Expense Analytics View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Spending Velocity
              </span>
              <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">₹54,700</p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                <ArrowDownRight className="w-3 h-3" /> -8.5% reduced overheads
              </span>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Monthly Burn Rate Trend
              </span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹1,82,000</p>
              <span className="text-[10px] text-gray-400 font-bold mt-1 block">
                Fixed payroll & store rent included
              </span>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1 text-amber-600">
                <Sparkles className="w-3 h-3" /> AI Cost-Reduction Insight
              </span>
              <p className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-2 leading-relaxed">
                Bulk local inventory purchasing at Bandra outlet saved <strong>₹12,400</strong> in freight fees this month.
              </p>
            </div>
          </div>

          {/* Expense Category Distribution */}
          <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
            <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white mb-4">
              Expense Category Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { category: "Store Inventory", amount: "₹32,500", percent: 59, color: "bg-amber-500" },
                { category: "Utilities & Electricity", amount: "₹14,200", percent: 26, color: "bg-blue-500" },
                { category: "Local Marketing", amount: "₹8,000", percent: 15, color: "bg-emerald-500" },
                { category: "Software & SaaS", amount: "₹2,000", percent: 4, color: "bg-purple-500" },
              ].map((c, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${c.color}`} />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{c.category}</span>
                  </div>
                  <p className="text-lg font-black text-[#1A1A1A] dark:text-white">{c.amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{c.percent}% of total spending</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
