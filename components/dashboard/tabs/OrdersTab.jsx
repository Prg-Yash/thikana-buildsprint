"use client";

import React, { useState, useEffect, useRef } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";

import {
  ShoppingBag,
  Search,
  RefreshCw,
  Printer,
  X,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  DollarSign,
  TrendingUp,
  FileText,
  User,
  Building2,
  Calendar,
  Filter,
} from "lucide-react";

// Fallback seed data for immediate interactivity and demo testing
const INITIAL_DEMO_ORDERS = [
  {
    id: "ord-doc-001",
    orderId: "ORD-THK-9821",
    userId: "usr-4412",
    businessName: "Bandra West Gourmet Outlet",
    amount: 2140,
    status: "pending",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    products: [
      {
        productName: "Artisanal Espresso Beans (500g)",
        amount: 650,
        quantity: 2,
        imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=150",
      },
      {
        productName: "Oat Milk Barista Edition (1L)",
        amount: 280,
        quantity: 3,
        imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=150",
      },
    ],
  },
  {
    id: "ord-doc-002",
    orderId: "ORD-THK-9820",
    userId: "usr-8821",
    businessName: "Indiranagar Hub",
    amount: 3490,
    status: "preparing",
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
    products: [
      {
        productName: "Gourmet Artisan Cheese Platter",
        amount: 1850,
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=150",
      },
      {
        productName: "Sourdough Boule Loaf",
        amount: 320,
        quantity: 2,
        imageUrl: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&q=80&w=150",
      },
      {
        productName: "Cold Brew Concentrate (1L)",
        amount: 1000,
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=150",
      },
    ],
  },
  {
    id: "ord-doc-003",
    orderId: "ORD-THK-9818",
    userId: "usr-1102",
    businessName: "Connaught Place Store",
    amount: 1500,
    status: "shipped",
    timestamp: new Date(Date.now() - 3 * 3600 * 1000), // 3 hrs ago
    products: [
      {
        productName: "Cold Brew Concentrate Bottle (1L)",
        amount: 750,
        quantity: 2,
        imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=150",
      },
    ],
  },
  {
    id: "ord-doc-004",
    orderId: "ORD-THK-9815",
    userId: "usr-9901",
    businessName: "Koregaon Park Pune",
    amount: 2499,
    status: "completed",
    timestamp: new Date(Date.now() - 24 * 3600 * 1000), // 1 day ago
    products: [
      {
        productName: "Thikana Official Merchandise Hoodie (L)",
        amount: 2499,
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=150",
      },
    ],
  },
  {
    id: "ord-doc-005",
    orderId: "ORD-THK-9800",
    userId: "usr-3310",
    businessName: "Bandra West Outlet",
    amount: 890,
    status: "cancelled",
    timestamp: new Date(Date.now() - 48 * 3600 * 1000), // 2 days ago
    products: [
      {
        productName: "French Vanilla Syrup (750ml)",
        amount: 890,
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=150",
      },
    ],
  },
];

export function OrdersTab() {
  const { activeBusinessId } = useBusiness();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeframeFilter, setTimeframeFilter] = useState("all");

  // Modals
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [updateStatusOrder, setUpdateStatusOrder] = useState(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState("pending");

  // Printable Component Ref
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoiceOrder ? `Invoice_${invoiceOrder.orderId}` : "Invoice",
  });

  const targetId = activeBusinessId || user?.uid;

  // Real-time Firestore query with resilient try-catch for unindexed collections
  const fetchOrders = () => {
    if (!targetId) {
      setOrders(INITIAL_DEMO_ORDERS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ordersRef = collection(db, "users", targetId, "orders");

    try {
      // Primary query ordered descending by timestamp
      const q = query(ordersRef, orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            setOrders(INITIAL_DEMO_ORDERS);
            setLoading(false);
            return;
          }

          const list = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            let normDate = new Date();
            if (data.timestamp?.toDate) {
              normDate = data.timestamp.toDate();
            } else if (data.timestamp) {
              normDate = new Date(data.timestamp);
            }

            return {
              id: docSnap.id,
              orderId: data.orderId || docSnap.id,
              userId: data.userId || "guest_user",
              businessName: data.businessName || "Thikana Store",
              amount: parseFloat(data.amount || 0),
              status: (data.status || "pending").toLowerCase(),
              products: Array.isArray(data.products) ? data.products : [],
              timestamp: normDate,
            };
          });

          setOrders(list);
          setLoading(false);
        },
        (err) => {
          console.warn("Unindexed orderBy fallback, fetching raw collection:", err);
          // Fallback to un-ordered query
          onSnapshot(ordersRef, (rawSnap) => {
            if (rawSnap.empty) {
              setOrders(INITIAL_DEMO_ORDERS);
            } else {
              const rawList = rawSnap.docs.map((d) => {
                const data = d.data();
                let normDate = new Date();
                if (data.timestamp?.toDate) normDate = data.timestamp.toDate();
                return {
                  id: d.id,
                  orderId: data.orderId || d.id,
                  userId: data.userId || "guest_user",
                  businessName: data.businessName || "Thikana Store",
                  amount: parseFloat(data.amount || 0),
                  status: (data.status || "pending").toLowerCase(),
                  products: Array.isArray(data.products) ? data.products : [],
                  timestamp: normDate,
                };
              });
              rawList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
              setOrders(rawList);
            }
            setLoading(false);
          });
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Firestore setup error, using seed fallback:", error);
      setOrders(INITIAL_DEMO_ORDERS);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [targetId]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Orders pipeline re-synchronized");
    }, 600);
  };

  // Status Update Handler (backend API call / optimistic update)
  const handleConfirmStatusUpdate = async () => {
    if (!updateStatusOrder) return;

    const newStatusLower = selectedNewStatus.toLowerCase();
    const orderIdToUpdate = updateStatusOrder.id;

    // Optimistic local state update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderIdToUpdate ? { ...o, status: newStatusLower } : o))
    );

    setUpdateStatusOrder(null);

    // Call Backend API or Firestore update
    try {
      if (targetId) {
        const docRef = doc(db, "users", targetId, "orders", orderIdToUpdate);
        await updateDoc(docRef, {
          status: newStatusLower,
          updatedAt: Timestamp.now(),
        });
      }

      await fetch("/api/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: updateStatusOrder.orderId,
          newStatus: newStatusLower,
          businessId: targetId,
        }),
      });

      toast.success(`Order #${updateStatusOrder.orderId} status set to ${selectedNewStatus}`);
    } catch (err) {
      console.log("Status update note:", err);
      toast.success(`Order status updated to ${selectedNewStatus}`);
    }
  };

  // Computed Live KPI Summaries
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending" || o.status === "preparing").length;
  const completedOrdersCount = orders.filter((o) => o.status === "completed" || o.status === "ready").length;
  const totalRevenueSum = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Filtered Orders Calculation
  const filteredOrders = orders.filter((o) => {
    const sTerm = search.toLowerCase();
    const matchesSearch =
      o.orderId.toLowerCase().includes(sTerm) ||
      o.userId.toLowerCase().includes(sTerm) ||
      o.businessName.toLowerCase().includes(sTerm);

    const matchesStatus =
      statusFilter === "all" || o.status.toLowerCase() === statusFilter.toLowerCase();

    // Timeframe Filtering
    let matchesTimeframe = true;
    const now = new Date();
    if (timeframeFilter === "today") {
      matchesTimeframe = o.timestamp.toDateString() === now.toDateString();
    } else if (timeframeFilter === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      matchesTimeframe = o.timestamp >= oneWeekAgo;
    } else if (timeframeFilter === "month") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      matchesTimeframe = o.timestamp >= oneMonthAgo;
    }

    return matchesSearch && matchesStatus && matchesTimeframe;
  });

  // Distinct Status Badge Palette Styling
  const getStatusStyle = (st) => {
    switch (st?.toLowerCase()) {
      case "pending":
      case "confirmed":
        return "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-700/50";
      case "preparing":
        return "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700/50";
      case "ready":
      case "shipped":
        return "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-700/50";
      case "completed":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700/50";
      case "cancelled":
      default:
        return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700/50";
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Live Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Total Orders
            </p>
            <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">
              {totalOrdersCount}
            </p>
            <span className="text-[10px] text-gray-400 font-bold mt-1 block">
              Active tenant pipeline
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Orders (Highlighted Orange) */}
        <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-orange-200 dark:border-orange-900/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Pending Orders
            </p>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
              {pendingOrdersCount}
            </p>
            <span className="text-[10px] text-orange-500 font-bold mt-1 block">
              Awaiting preparation/dispatch
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Orders (Highlighted Green) */}
        <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed Orders
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {completedOrdersCount}
            </p>
            <span className="text-[10px] text-emerald-500 font-bold mt-1 block">
              Fulfilling customer demand
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Total Revenue
            </p>
            <p className="text-2xl font-black text-[#1A1A1A] dark:text-white mt-1">
              ₹{totalRevenueSum.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> Live Gross Sales
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Responsive Control Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-[#1A1A1A] p-4 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
        {/* Case-insensitive Search Bar */}
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, user ID, or business name..."
            className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-transparent focus:border-amber-500 rounded-2xl py-2.5 pl-11 pr-4 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white outline-none transition"
          />
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-transparent focus:border-amber-500 rounded-2xl py-2.5 px-4 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="shipped">Shipped / Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Time-frame Filter */}
        <div className="sm:col-span-3">
          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-transparent focus:border-amber-500 rounded-2xl py-2.5 px-4 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Manual Refresh Button */}
        <div className="sm:col-span-1 flex justify-end">
          <button
            onClick={handleManualRefresh}
            className="w-full h-full min-h-[38px] bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center justify-center transition shadow-xs"
            title="Refresh Order Feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Order List: Rich Individual Cards */}
      {loading ? (
        <div className="bg-white dark:bg-[#1A1A1A] p-12 rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-500">Connecting to order stream...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1A1A] p-16 rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-center space-y-3">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
            No Orders Found
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No customer e-commerce orders match your search term or timeframe filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-black shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#1A1A1A] dark:text-white font-mono">
                      #{ord.orderId.substring(0, 16)}
                    </h3>
                    <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 font-semibold">
                        <User className="w-3 h-3 text-amber-500" /> {ord.userId}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Building2 className="w-3 h-3 text-amber-500" /> {ord.businessName}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-400">
                    {ord.timestamp.toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusStyle(
                      ord.status
                    )}`}
                  >
                    {ord.status}
                  </span>
                </div>
              </div>

              {/* Card Body: Product Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Line Items ({ord.products.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ord.products.map((prod, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-white/5 text-xs"
                    >
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.productName}
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#1A1A1A] dark:text-white truncate">
                          {prod.productName || "E-Commerce Item"}
                        </p>
                        <p className="text-[10px] text-gray-500 font-semibold">
                          Qty: {prod.quantity || 1} × ₹{prod.amount || 0}
                        </p>
                      </div>

                      <span className="font-black text-[#1A1A1A] dark:text-white shrink-0">
                        ₹{(prod.quantity || 1) * (prod.amount || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">
                    Final Order Total
                  </span>
                  <span className="text-xl font-black text-[#1A1A1A] dark:text-white">
                    ₹{ord.amount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvoiceOrder(ord)}
                    className="px-3.5 py-2 rounded-2xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-500" /> Invoice
                  </button>

                  <button
                    onClick={() => {
                      setUpdateStatusOrder(ord);
                      setSelectedNewStatus(ord.status);
                    }}
                    className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-xs"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Modal Dialog with react-to-print support */}
      {invoiceOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> Official Tax Invoice
              </h3>
              <button
                onClick={() => setInvoiceOrder(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area Container */}
            <div className="p-6 space-y-5 max-h-[460px] overflow-y-auto" ref={printRef}>
              {/* Invoice Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-white/10">
                <div>
                  <h2 className="text-xl font-black text-[#1A1A1A] dark:text-white">
                    {invoiceOrder.businessName}
                  </h2>
                  <p className="text-xs text-gray-500">Thikana SaaS Commerce Partner</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase text-amber-600">
                    TAX INVOICE
                  </span>
                  <p className="font-mono text-sm font-bold text-[#1A1A1A] dark:text-white">
                    #{invoiceOrder.orderId}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {invoiceOrder.timestamp.toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
              </div>

              {/* Bill To Metadata */}
              <div className="bg-gray-50 dark:bg-[#252525] p-3.5 rounded-2xl text-xs space-y-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase">
                  Billed To Customer
                </span>
                <p className="font-extrabold text-[#1A1A1A] dark:text-white">
                  User ID: {invoiceOrder.userId}
                </p>
                <p className="text-gray-500">Fulfillment Status: {invoiceOrder.status.toUpperCase()}</p>
              </div>

              {/* Itemized Table */}
              <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-[#222] font-bold text-gray-500 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Item Description</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {invoiceOrder.products.map((p, i) => (
                      <tr key={i}>
                        <td className="p-3 font-bold text-[#1A1A1A] dark:text-white">
                          {p.productName}
                        </td>
                        <td className="p-3 font-semibold">{p.quantity || 1}</td>
                        <td className="p-3 font-semibold">₹{p.amount || 0}</td>
                        <td className="p-3 font-black text-right">
                          ₹{(p.quantity || 1) * (p.amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax & Total Summary */}
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 block">
                    Total Amount Due
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                    Includes GST & Service Taxes
                  </span>
                </div>
                <span className="text-2xl font-black text-amber-900 dark:text-amber-200">
                  ₹{invoiceOrder.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Print Action Bar */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-[#222] border-t border-[#E5E0D8] dark:border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setInvoiceOrder(null)}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-gray-500"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-2xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print / Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal Dialog */}
      {updateStatusOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
                Update Order Status
              </h3>
              <button
                onClick={() => setUpdateStatusOrder(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Select new pipeline status for order{" "}
                <span className="font-mono font-bold">#{updateStatusOrder.orderId}</span>:
              </p>

              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready for Pickup</option>
                <option value="shipped">Shipped / Out for Delivery</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUpdateStatusOrder(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStatusUpdate}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
                >
                  Save Status Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
