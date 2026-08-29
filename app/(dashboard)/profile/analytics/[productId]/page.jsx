"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import {
  ArrowLeft,
  BarChart2,
  TrendingUp,
  Package,
  IndianRupee,
  ShoppingBag,
  Eye,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function ProductAnalyticsPage({ params }) {
  const unwrappedParams = use(params);
  const productId = unwrappedParams?.productId || "";
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProductAnalytics() {
      if (!user?.uid || !productId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        let pData = null;

        // CANONICAL PATH FIRST: users/{userId}/products/{productId}
        const subSnap = await getDoc(doc(db, "users", user.uid, "products", productId));
        if (subSnap.exists()) {
          pData = { id: subSnap.id, ...subSnap.data() };
        } else {
          // Fallback to top-level collection
          const topSnap = await getDoc(doc(db, "products", productId));
          if (topSnap.exists()) {
            pData = { id: topSnap.id, ...topSnap.data() };
          }
        }

        if (!pData) {
          setError("Product record not found in inventory.");
        } else {
          setProduct(pData);
        }
      } catch (err) {
        console.error("Error loading product analytics:", err);
        setError("Failed to fetch product performance data.");
      } finally {
        setLoading(false);
      }
    }

    loadProductAnalytics();
  }, [user, productId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-xs text-gray-400 animate-pulse">
        Loading product performance analytics...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm font-bold text-red-600 dark:text-red-400">{error || "Product not found"}</p>
        <Link href="/profile/inventory" className="inline-block px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold">
          Back to Inventory
        </Link>
      </div>
    );
  }

  const price = parseFloat(product.price || "0");
  const quantity = parseInt(product.quantity || "0", 10);
  const totalValuation = price * quantity;
  const totalSalesCount = product.totalSales || product.purchaseCount || 0;
  const totalRevenue = product.totalRevenue || price * totalSalesCount;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/profile/inventory"
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Product Performance</span>
        </div>
      </div>

      {/* Product Summary Header */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
          <Image
            src={product.imageUrl || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80"}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1 space-y-1 text-center sm:text-left">
          <span className="text-[10px] font-bold uppercase text-gray-400">{product.category || "General"}</span>
          <h1 className="text-xl font-black text-[#1A1A1A] dark:text-white">{product.name}</h1>
          <p className="text-xs text-gray-500 line-clamp-2">{product.description || "No description provided."}</p>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-500">Unit Price</span>
          <p className="text-2xl font-black text-[#1A1A1A] dark:text-white">₹{price}</p>
          <p className="text-[10px] text-gray-400 font-bold">Catalog Rate</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-500">Stock In Hand</span>
          <p className="text-2xl font-black text-[#1A1A1A] dark:text-white">{quantity}</p>
          <p className="text-[10px] text-emerald-600 font-bold">In Inventory</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-500">Total Units Sold</span>
          <p className="text-2xl font-black text-[#1A1A1A] dark:text-white">{totalSalesCount}</p>
          <p className="text-[10px] text-blue-600 font-bold">Completed Purchases</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-500">Stock Valuation</span>
          <p className="text-2xl font-black text-[#1A1A1A] dark:text-white">₹{totalValuation.toLocaleString()}</p>
          <p className="text-[10px] text-purple-600 font-bold">Total Stock Value</p>
        </div>
      </div>
    </div>
  );
}
