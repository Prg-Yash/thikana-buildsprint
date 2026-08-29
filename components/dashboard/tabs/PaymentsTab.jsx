"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Copy,
  Check,
  QrCode,
  DollarSign,
  TrendingUp,
  Clock,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

const INITIAL_PAYMENT_LINKS = [
  {
    id: "plink-001",
    title: "Annual VIP Membership - Bandra Hub",
    amount: 15000,
    currency: "INR",
    customerName: "Karan Johar",
    customerEmail: "karan@dharma.in",
    status: "Paid",
    createdAt: "2026-08-28",
    expiresAt: "2026-09-05",
    razorpayUrl: "https://rzp.io/l/thikana-vip-001",
  },
  {
    id: "plink-002",
    title: "Catering Event Advance Payment",
    amount: 45000,
    currency: "INR",
    customerName: "Meera Rajput",
    customerEmail: "meera.r@gmail.com",
    status: "Active",
    createdAt: "2026-08-27",
    expiresAt: "2026-09-02",
    razorpayUrl: "https://rzp.io/l/catering-adv-002",
  },
  {
    id: "plink-003",
    title: "Custom Interior Consultation Fee",
    amount: 8500,
    currency: "INR",
    customerName: "Tushar Kapoor",
    customerEmail: "tushar@balaji.com",
    status: "Expired",
    createdAt: "2026-08-15",
    expiresAt: "2026-08-22",
    razorpayUrl: "https://rzp.io/l/consult-003",
  },
  {
    id: "plink-004",
    title: "Bulk Corporate Order Deposit",
    amount: 120000,
    currency: "INR",
    customerName: "Anil Ambani",
    customerEmail: "anil@reliance.in",
    status: "Cancelled",
    createdAt: "2026-08-10",
    expiresAt: "2026-08-20",
    razorpayUrl: "https://rzp.io/l/corp-dep-004",
  },
];

export function PaymentsTab() {
  const [links, setLinks] = useState(INITIAL_PAYMENT_LINKS);
  const [copiedId, setCopiedId] = useState(null);
  const [qrModalLink, setQrModalLink] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Link Form State
  const [form, setForm] = useState({
    title: "",
    amount: "",
    currency: "INR",
    customerName: "",
    customerEmail: "",
    expiryDays: "7",
  });

  const handleCopyLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLink = (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(form.expiryDays || 7));

    const newLink = {
      id: `plink-${Date.now()}`,
      title: form.title,
      amount: parseFloat(form.amount),
      currency: form.currency,
      customerName: form.customerName || "Valued Customer",
      customerEmail: form.customerEmail || "customer@thikana.inc",
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
      expiresAt: expiryDate.toISOString().split("T")[0],
      razorpayUrl: `https://rzp.io/l/thikana-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setLinks([newLink, ...links]);
    setIsCreateModalOpen(false);
    setForm({
      title: "",
      amount: "",
      currency: "INR",
      customerName: "",
      customerEmail: "",
      expiryDays: "7",
    });
  };

  // Metric Computations
  const totalCollected = links
    .filter((l) => l.status === "Paid")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const activeLinksAmount = links
    .filter((l) => l.status === "Active")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Total Revenue Collected
            </p>
            <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">
              ₹{totalCollected.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +18.4% this month
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Active Payment Links
            </p>
            <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">
              ₹{activeLinksAmount.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 block">
              {links.filter((l) => l.status === "Active").length} links awaiting payment
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Gateway Sync Status
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-6 h-6" /> Live Sync
            </p>
            <span className="text-[10px] text-gray-500 font-bold mt-1 block">
              Razorpay API Connected
            </span>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Link
          </button>
        </div>
      </div>

      {/* Payment Links Table */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between">
          <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" /> Dynamic Payment Links & Collections
          </h3>
          <span className="text-xs text-gray-500 font-semibold">
            Tracking {links.length} Razorpay links
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F9F8F6] dark:bg-[#222222] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#E5E0D8] dark:border-white/10">
              <tr>
                <th className="px-5 py-3.5">Payment Title</th>
                <th className="px-5 py-3.5">Customer Details</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Expires</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8] dark:divide-white/10">
              {links.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-[#FDFCFB] dark:hover:bg-white/5 transition"
                >
                  <td className="px-5 py-4">
                    <p className="font-bold text-[#1A1A1A] dark:text-white">{l.title}</p>
                    <p className="text-[10px] text-gray-500 font-mono truncate max-w-xs">{l.razorpayUrl}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#1A1A1A] dark:text-white">{l.customerName}</p>
                    <p className="text-[11px] text-gray-500">{l.customerEmail}</p>
                  </td>
                  <td className="px-5 py-4 font-black text-[#1A1A1A] dark:text-white whitespace-nowrap">
                    ₹{l.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-block ${
                        l.status === "Paid"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : l.status === "Active"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : l.status === "Expired"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">{l.expiresAt}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopyLink(l.id, l.razorpayUrl)}
                        className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition"
                        title="Copy Payment Link"
                      >
                        {copiedId === l.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => setQrModalLink(l)}
                        className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition"
                        title="Generate QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Razorpay Link Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" /> Create Dynamic Razorpay Link
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLink} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Payment Title / Reason
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. VIP Subscription Fee"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="15000"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Karan Johar"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    placeholder="karan@dharma.in"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Duration
                </label>
                <select
                  value={form.expiryDays}
                  onChange={(e) => setForm({ ...form, expiryDays: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                >
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
                >
                  Generate Razorpay Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code SVG Modal */}
      {qrModalLink && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-sm text-[#1A1A1A] dark:text-white">
                Payment QR Code
              </h3>
              <button
                onClick={() => setQrModalLink(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 inline-block shadow-inner mb-4">
              {/* Clean SVG Representation of QR Code */}
              <svg className="w-48 h-48 mx-auto text-[#1A1A1A]" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="white" />
                <path
                  d="M10 10 h30 v30 h-30 z M15 15 v20 h20 v-20 z M20 20 h10 v10 h-10 z"
                  fill="currentColor"
                />
                <path
                  d="M60 10 h30 v30 h-30 z M65 15 v20 h20 v-20 z M70 20 h10 v10 h-10 z"
                  fill="currentColor"
                />
                <path
                  d="M10 60 h30 v30 h-30 z M15 65 v20 h20 v-20 z M20 70 h10 v10 h-10 z"
                  fill="currentColor"
                />
                <rect x="45" y="15" width="10" height="30" fill="currentColor" />
                <rect x="60" y="50" width="25" height="10" fill="currentColor" />
                <rect x="50" y="70" width="35" height="15" fill="currentColor" />
              </svg>
            </div>

            <p className="font-extrabold text-sm text-[#1A1A1A] dark:text-white">
              {qrModalLink.title}
            </p>
            <p className="text-xs text-amber-600 font-bold mt-0.5">
              ₹{qrModalLink.amount.toLocaleString("en-IN")}
            </p>

            <button
              onClick={() => handleCopyLink(qrModalLink.id, qrModalLink.razorpayUrl)}
              className="mt-5 w-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copy Link URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
