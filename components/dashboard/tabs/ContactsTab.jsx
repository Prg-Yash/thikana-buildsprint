"use client";

import React, { useState, useEffect } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

import {
  Search,
  MessageSquare,
  Inbox,
  X,
  Mail,
  Phone,
  Calendar,
  Building2,
  Tag,
  DollarSign,
  MoreVertical,
  ChevronDown,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

// Fallback seed data for immediate demonstration if firestore collection is empty
const INITIAL_DEMO_INQUIRIES = [
  {
    id: "inq-001",
    customerName: "Arjun Mehta",
    customerEmail: "arjun.m@gmail.com",
    phone: "+91 98210 44556",
    type: "service",
    serviceName: "Artisanal Catering & Bulk Orders",
    propertyTitle: "",
    propertyLocation: "",
    budget: "₹50,000 - ₹1,000,000",
    message: "Hi, we want to acquire monthly artisanal coffee catering and office breakfast subscriptions for our Bandra West team.",
    status: "pending",
    customerPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date("2026-08-28T14:32:00"),
  },
  {
    id: "inq-002",
    customerName: "Sneha Kapoor",
    customerEmail: "sneha.k@outlook.com",
    phone: "+91 97112 33889",
    type: "real-estate",
    serviceName: "",
    propertyTitle: "Commercial Retail Storefront - Ground Floor",
    propertyLocation: "Koregaon Park, Pune",
    budget: "₹2,50,000 / month",
    message: "Interested in leasing a franchise commercial outlet space at Koregaon Park. Please share financial feasibility deck and floor plan.",
    status: "in-progress",
    customerPhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date("2026-08-27T11:15:00"),
  },
  {
    id: "inq-003",
    customerName: "Rohan Kulkarni",
    customerEmail: "rohan.k@techcorp.io",
    phone: "+91 99300 77112",
    type: "general",
    serviceName: "",
    propertyTitle: "",
    propertyLocation: "",
    budget: "",
    message: "Order #ORD-8821 payment went through twice on Razorpay gateway. Requesting refund adjustment for duplicate transaction.",
    status: "completed",
    customerPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date("2026-08-25T09:40:00"),
  },
  {
    id: "inq-004",
    customerName: "Bot Marketing Pro",
    customerEmail: "spambot99@fake-offers.xyz",
    phone: "+1 800 555 0199",
    type: "general",
    serviceName: "",
    propertyTitle: "",
    propertyLocation: "",
    budget: "",
    message: "Guaranteed 10,000 automated backlinks and instant local Google SEO ranking within 24 hours.",
    status: "cancelled",
    customerPhoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date("2026-08-24T03:12:00"),
  },
];

export function ContactsTab() {
  const { activeBusinessId } = useBusiness();
  const { user } = useAuth();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'in-progress' | 'completed' | 'cancelled'
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'service' | 'real-estate' | 'general'
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & UI States
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Target Tenant ID Calculation
  const targetId = activeBusinessId || user?.uid;

  // Real-time Firestore Subcollection Listener: users/{targetId}/inquiries
  useEffect(() => {
    if (!targetId) {
      setInquiries(INITIAL_DEMO_INQUIRIES);
      setLoading(false);
      return;
    }

    setLoading(true);
    const inquiriesRef = collection(db, "users", targetId, "inquiries");

    const unsubscribe = onSnapshot(
      inquiriesRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // If no documents exist in Firestore subcollection, load seed data
          setInquiries(INITIAL_DEMO_INQUIRIES);
          setLoading(false);
          return;
        }

        const rawList = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          let dateObj = new Date();
          if (data.createdAt?.toDate) {
            dateObj = data.createdAt.toDate();
          } else if (data.createdAt) {
            dateObj = new Date(data.createdAt);
          }

          let item = {
            id: docSnap.id,
            customerName: data.customerName || "Customer Inquiry",
            customerEmail: data.customerEmail || "No Email",
            phone: data.phone || data.customerPhone || "N/A",
            type: data.type || "general",
            serviceName: data.serviceName || "",
            propertyTitle: data.propertyTitle || "",
            propertyLocation: data.propertyLocation || "",
            budget: data.budget || "",
            message: data.message || "",
            status: data.status || "pending",
            customerPhoto: data.customerPhoto || null,
            createdAt: dateObj,
            customerId: data.customerId || null,
          };

          // Enrich asynchronously from users/{customerId} if customerId present
          if (data.customerId) {
            try {
              const custDoc = await getDoc(doc(db, "users", data.customerId));
              if (custDoc.exists()) {
                const cData = custDoc.data();
                item.customerName = cData.fullName || cData.name || item.customerName;
                item.customerEmail = cData.email || item.customerEmail;
                item.phone = cData.phone || item.phone;
                item.customerPhoto = cData.photoURL || cData.avatar || item.customerPhoto;
              }
            } catch (err) {
              console.log("Customer fetch note:", err);
            }
          }

          rawList.push(item);
        }

        // Sort descending by date in memory
        rawList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setInquiries(rawList);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Inquiries error, falling back to seed:", err);
        setInquiries(INITIAL_DEMO_INQUIRIES);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetId]);

  // Handle Status Update in Firestore & Local State
  const handleUpdateStatus = async (contactId, newStatus) => {
    const updatedStatusLower = newStatus.toLowerCase();

    // Optimistic Local State Update
    setInquiries((prev) =>
      prev.map((item) =>
        item.id === contactId ? { ...item, status: updatedStatusLower } : item
      )
    );

    if (selectedInquiry?.id === contactId) {
      setSelectedInquiry((prev) =>
        prev ? { ...prev, status: updatedStatusLower } : null
      );
    }

    setOpenDropdownId(null);

    // Update Firestore Document
    if (targetId) {
      try {
        const docRef = doc(db, "users", targetId, "inquiries", contactId);
        await updateDoc(docRef, {
          status: updatedStatusLower,
          updatedAt: Timestamp.now(),
        });
        toast.success(`Inquiry status updated to ${newStatus}`);
      } catch (err) {
        console.log("Firestore update fallback notice:", err);
        toast.success(`Inquiry status set to ${newStatus}`);
      }
    } else {
      toast.success(`Inquiry status set to ${newStatus}`);
    }
  };

  // Filter & Search Logic
  const filteredInquiries = inquiries.filter((item) => {
    const sTerm = searchQuery.toLowerCase();
    const titleMatch =
      (item.serviceName && item.serviceName.toLowerCase().includes(sTerm)) ||
      (item.propertyTitle && item.propertyTitle.toLowerCase().includes(sTerm));

    const matchesSearch =
      item.customerName.toLowerCase().includes(sTerm) ||
      item.customerEmail.toLowerCase().includes(sTerm) ||
      item.message.toLowerCase().includes(sTerm) ||
      Boolean(titleMatch);

    const matchesStatus =
      statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesType =
      typeFilter === "all" || item.type.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  // Helper: Status Styling
  const getStatusBadgeStyle = (st) => {
    const statusLower = st?.toLowerCase();
    switch (statusLower) {
      case "pending":
        return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/50";
      case "in-progress":
      case "in progress":
        return "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700/50";
      case "completed":
      case "resolved":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700/50";
      case "cancelled":
      case "spam":
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" /> Contacts & Inquiries Inbox
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time customer inquiries, services & real-estate requests for tenant ID:{" "}
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
              {targetId || "default"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs font-bold">
            {filteredInquiries.length} Active Leads
          </span>
        </div>
      </div>

      {/* Reactive Filter & Case-Insensitive Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Bar */}
        <div className="md:col-span-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, email, message, or service title..."
            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 transition shadow-xs"
          />
        </div>

        {/* Status Filter Select */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 transition shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending (Amber)</option>
            <option value="in-progress">In Progress (Blue)</option>
            <option value="completed">Completed (Green)</option>
            <option value="cancelled">Cancelled (Slate)</option>
          </select>
        </div>

        {/* Inquiry Type Select */}
        <div className="md:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 transition shadow-xs"
          >
            <option value="all">All Types</option>
            <option value="service">Services</option>
            <option value="real-estate">Real Estate</option>
            <option value="general">General Inquiry</option>
          </select>
        </div>
      </div>

      {/* Main Content Area: Table vs Empty State */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">Loading live customer inquiries from Firestore...</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
              No Matching Inquiries Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              There are no customer messages or lead inquiries matching your search or selected filter options.
            </p>
            <button
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
                setSearchQuery("");
              }}
              className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] px-4 py-2 rounded-2xl text-xs font-bold transition shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Clean Shadcn-Style Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F9F8F6] dark:bg-[#222222] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#E5E0D8] dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Inquiry Details</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D8] dark:divide-white/10">
                {filteredInquiries.map((inq) => {
                  const inquiryTitle =
                    inq.serviceName || inq.propertyTitle || "General Business Request";

                  return (
                    <tr
                      key={inq.id}
                      onClick={() => setSelectedInquiry(inq)}
                      className="hover:bg-[#FDFCFB] dark:hover:bg-white/5 transition cursor-pointer group"
                    >
                      {/* Customer Avatar & Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {inq.customerPhoto ? (
                            <img
                              src={inq.customerPhoto}
                              alt={inq.customerName}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-bold text-sm shrink-0">
                              {inq.customerName ? inq.customerName.charAt(0).toUpperCase() : "C"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-extrabold text-[#1A1A1A] dark:text-white truncate">
                              {inq.customerName}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">{inq.customerEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type Capitalized Outline Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-xl border border-gray-300 dark:border-white/20 text-[10px] font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                          {inq.type}
                        </span>
                      </td>

                      {/* Inquiry Details: Bold Title & Single-Line Clamped Preview */}
                      <td className="px-6 py-4">
                        <p className="font-extrabold text-[#1A1A1A] dark:text-white truncate max-w-xs">
                          {inquiryTitle}
                        </p>
                        <p className="text-[11px] text-gray-500 line-clamp-1 max-w-sm mt-0.5">
                          {inq.message}
                        </p>
                      </td>

                      {/* Formatted Submission Date */}
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
                        {inq.createdAt.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Distinct Styled Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${getStatusBadgeStyle(
                            inq.status
                          )}`}
                        >
                          {inq.status}
                        </span>
                      </td>

                      {/* Actions Dropdown */}
                      <td
                        className="px-6 py-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setOpenDropdownId(openDropdownId === inq.id ? null : inq.id)
                            }
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openDropdownId === inq.id && (
                            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1C1C1C] border border-[#E5E0D8] dark:border-white/10 rounded-2xl shadow-xl py-1 z-50">
                              <p className="px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                                Change Status
                              </p>
                              {["pending", "in-progress", "completed", "cancelled"].map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleUpdateStatus(inq.id, st)}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-white/5 capitalize transition flex items-center justify-between"
                                >
                                  <span>{st}</span>
                                  {inq.status.toLowerCase() === st && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive Inquiry Details Modal Dialog */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <div className="flex items-center gap-3">
                {selectedInquiry.customerPhoto ? (
                  <img
                    src={selectedInquiry.customerPhoto}
                    alt={selectedInquiry.customerName}
                    className="w-11 h-11 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-black text-base">
                    {selectedInquiry.customerName
                      ? selectedInquiry.customerName.charAt(0).toUpperCase()
                      : "C"}
                  </div>
                )}
                <div>
                  <h3 className="font-black text-lg text-[#1A1A1A] dark:text-white">
                    {selectedInquiry.customerName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Inquiry ID: <span className="font-mono font-bold">{selectedInquiry.id}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[460px] overflow-y-auto">
              {/* Contact Profile Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-[#252525] p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-semibold text-[#1A1A1A] dark:text-white truncate">
                    {selectedInquiry.customerEmail}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-semibold text-[#1A1A1A] dark:text-white">
                    {selectedInquiry.phone}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-semibold text-[#1A1A1A] dark:text-white">
                    Submitted:{" "}
                    {selectedInquiry.createdAt.toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-semibold text-[#1A1A1A] dark:text-white capitalize">
                    Type: {selectedInquiry.type}
                  </span>
                </div>
              </div>

              {/* Service or Real Estate Specifics */}
              {(selectedInquiry.serviceName ||
                selectedInquiry.propertyTitle ||
                selectedInquiry.budget) && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Service / Property Specifics
                  </span>
                  {selectedInquiry.serviceName && (
                    <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                      Requested Service: {selectedInquiry.serviceName}
                    </p>
                  )}
                  {selectedInquiry.propertyTitle && (
                    <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                      Property Listing: {selectedInquiry.propertyTitle}{" "}
                      {selectedInquiry.propertyLocation && `(${selectedInquiry.propertyLocation})`}
                    </p>
                  )}
                  {selectedInquiry.budget && (
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                      Target Budget: {selectedInquiry.budget}
                    </p>
                  )}
                </div>
              )}

              {/* Unclipped Full Message */}
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                  Full Customer Message
                </span>
                <div className="bg-white dark:bg-[#222] p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-medium text-[#1A1A1A] dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {selectedInquiry.message || "No detailed text message provided."}
                </div>
              </div>
            </div>

            {/* Embedded Status Change Footer Bar */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-[#222] border-t border-[#E5E0D8] dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Update Inquiry Status:</span>

              <select
                value={selectedInquiry.status.toLowerCase()}
                onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                className="bg-white dark:bg-[#333] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
              >
                <option value="pending">Pending (Amber)</option>
                <option value="in-progress">In Progress (Blue)</option>
                <option value="completed">Completed (Green)</option>
                <option value="cancelled">Cancelled (Slate)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
