"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  Check,
  Users,
  Calendar,
  X,
  Edit2,
  RefreshCw,
  Zap,
} from "lucide-react";

const INITIAL_PLANS = [
  {
    id: "plan-001",
    name: "VIP Local Membership",
    frequency: "Monthly",
    price: 1499,
    taxRate: 18,
    trialDays: 7,
    description: "Exclusive access to local discounts, priority workshop slots, and complimentary delivery.",
    features: [
      "Priority Table Reservations",
      "10% Flat Cashback on Store POS",
      "Free Express Local Delivery",
      "Dedicated WhatsApp Support",
    ],
    activeSubscribers: 420,
    enabled: true,
  },
  {
    id: "plan-002",
    name: "Corporate Executive Pass",
    frequency: "Yearly",
    price: 14999,
    taxRate: 18,
    trialDays: 14,
    description: "Tailored subscription pass for local businesses and high-frequency patrons.",
    features: [
      "Uncapped Express Deliveries",
      "Monthly Complimentary Degustation Menu",
      "Co-Working Lounge Access",
      "GST Invoice Tax Credits",
    ],
    activeSubscribers: 185,
    enabled: true,
  },
  {
    id: "plan-003",
    name: "Weekend Gourmet Club",
    frequency: "Monthly",
    price: 899,
    taxRate: 18,
    trialDays: 0,
    description: "Special weekend dining box and curator chef tastings delivered every Saturday.",
    features: [
      "Chef Tasting Box Every Saturday",
      "Exclusive Sommelier Notes",
      "Member-Only Secret Tastings",
    ],
    activeSubscribers: 95,
    enabled: false,
  },
];

export function PlansTab() {
  const [plans, setPlans] = useState(INITIAL_PLANS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    frequency: "Monthly",
    price: "",
    taxRate: "18",
    trialDays: "7",
    description: "",
    featureInput: "",
    features: [],
  });

  const handleTogglePlan = (id) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleAddFeature = () => {
    if (form.featureInput.trim()) {
      setForm({
        ...form,
        features: [...form.features, form.featureInput.trim()],
        featureInput: "",
      });
    }
  };

  const handleRemoveFeature = (index) => {
    setForm({
      ...form,
      features: form.features.filter((_, i) => i !== index),
    });
  };

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setForm({
      name: "",
      frequency: "Monthly",
      price: "",
      taxRate: "18",
      trialDays: "7",
      description: "",
      featureInput: "",
      features: ["Complimentary Local Delivery", "Priority Customer Support"],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      frequency: plan.frequency,
      price: plan.price.toString(),
      taxRate: plan.taxRate.toString(),
      trialDays: plan.trialDays.toString(),
      description: plan.description,
      featureInput: "",
      features: [...plan.features],
    });
    setIsModalOpen(true);
  };

  const handleSavePlan = (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;

    if (editingPlan) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id
            ? {
                ...p,
                name: form.name,
                frequency: form.frequency,
                price: parseFloat(form.price),
                taxRate: parseFloat(form.taxRate || 18),
                trialDays: parseInt(form.trialDays || 0),
                description: form.description,
                features: form.features,
              }
            : p
        )
      );
    } else {
      const newPlan = {
        id: `plan-${Date.now()}`,
        name: form.name,
        frequency: form.frequency,
        price: parseFloat(form.price),
        taxRate: parseFloat(form.taxRate || 18),
        trialDays: parseInt(form.trialDays || 0),
        description: form.description,
        features: form.features,
        activeSubscribers: 0,
        enabled: true,
      };
      setPlans([newPlan, ...plans]);
    }

    setIsModalOpen(false);
  };

  const totalActiveSubscribers = plans.reduce(
    (acc, curr) => acc + (curr.enabled ? curr.activeSubscribers : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" /> Recurring Billing Plans & Subscriptions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage pricing tiers, trial days, feature lists, and automated Razorpay plan sync.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <Users className="w-4 h-4" /> {totalActiveSubscribers} Total Active Members
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-3xl p-6 flex flex-col border transition-all duration-200 relative ${
              plan.enabled
                ? "bg-white dark:bg-[#1A1A1A] border-[#E5E0D8] dark:border-white/10 shadow-sm"
                : "bg-gray-50 dark:bg-[#151515] border-gray-200 dark:border-white/5 opacity-70"
            }`}
          >
            {/* Top Bar: Frequency & Toggle */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {plan.frequency} Billing
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(plan)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
                  title="Edit Plan"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Enable/Disable Toggle */}
                <button
                  onClick={() => handleTogglePlan(plan.id)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 relative ${
                    plan.enabled ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                  title={plan.enabled ? "Disable Plan" : "Enable Plan"}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      plan.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <h3 className="font-extrabold text-lg text-[#1A1A1A] dark:text-white mb-1">
              {plan.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed min-h-[36px]">
              {plan.description}
            </p>

            {/* Pricing Details */}
            <div className="mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#1A1A1A] dark:text-white">
                  ₹{plan.price.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-gray-400 font-semibold">
                  / {plan.frequency.toLowerCase()}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                +{plan.taxRate}% GST • {plan.trialDays} Days Free Trial
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-2.5 mb-6 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Included Features:
              </span>
              {plan.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Footer Stats */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-400" /> {plan.activeSubscribers} Subscribers
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-extrabold flex items-center gap-1">
                <Zap className="w-3 h-3" /> Gateway Synced
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
                {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. VIP Local Club"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="1499"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                    placeholder="18"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    value={form.trialDays}
                    onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                    placeholder="7"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Plan Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe perks included for subscriber..."
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                />
              </div>

              {/* Dynamic Feature Bullets */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Feature Highlights
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={form.featureInput}
                    onChange={(e) => setForm({ ...form, featureInput: e.target.value })}
                    placeholder="Add a perk bullet..."
                    className="flex-1 bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#1A1A1A] dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] px-3.5 py-2 rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {form.features.map((f, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#2A2A2A] text-gray-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(i)}
                        className="text-gray-400 hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
                >
                  Save & Sync Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
