"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  addNotification,
} from "@/lib/notifications";
import toast from "react-hot-toast";
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  Package,
  MessageCircle,
  Tag,
  Users,
  Settings,
  Sparkles,
  ChevronDown,
  Trash2,
  ExternalLink,
  MessageSquare,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  Info,
  Clock,
} from "lucide-react";

// Relative time formatter helper
function formatRelativeTime(dateInput) {
  if (!dateInput) return "Just now";
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Map notification type to icon, label, and Tailwind color themes
const TYPE_CONFIG = {
  order_update: {
    icon: Package,
    label: "Order Updates",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  message: {
    icon: MessageCircle,
    label: "Messages & Chat",
    badgeBg: "bg-blue-100 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  promotion: {
    icon: Tag,
    label: "Promotions & Offers",
    badgeBg: "bg-purple-100 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  follower: {
    icon: Users,
    label: "Community & Followers",
    badgeBg: "bg-indigo-100 dark:bg-indigo-950/60",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  system: {
    icon: Settings,
    label: "System Alerts",
    badgeBg: "bg-slate-200 dark:bg-slate-800",
    badgeText: "text-slate-700 dark:text-slate-300",
    border: "border-slate-400/30",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
  test: {
    icon: Sparkles,
    label: "Test Multi-Channel",
    badgeBg: "bg-rose-100 dark:bg-rose-950/60",
    badgeText: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
};

export function NotificationsPage() {
  const { user } = useAuth();

  // State
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all"); // 'all' | type key
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Test Notification Panel Form State
  const [testTitle, setTestTitle] = useState("Order Shipped!");
  const [testMessage, setTestMessage] = useState("Your local store order #ORD-9821 has been packed and dispatched.");
  const [testType, setTestType] = useState("order_update");
  const [testWhatsApp, setTestWhatsApp] = useState(true);
  const [testEmail, setTestEmail] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // 1. Real-time Firestore Listener on users/{user.uid}/notifications
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const notifsRef = collection(db, "users", user.uid, "notifications");

    // Real-time listener ordered by timestamp descending
    let q;
    try {
      q = query(notifsRef, orderBy("timestamp", "desc"));
    } catch (e) {
      q = notifsRef;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let normDate = new Date();
          if (data.timestamp?.toDate) {
            normDate = data.timestamp.toDate();
          } else if (data.timestamp) {
            normDate = new Date(data.timestamp);
          } else if (data.createdAt?.toDate) {
            normDate = data.createdAt.toDate();
          }

          return {
            id: docSnap.id,
            ...data,
            timestampFormatted: normDate,
            relativeTime: formatRelativeTime(normDate),
          };
        });

        // Client-side sort descending if fallback query was un-ordered
        list.sort((a, b) => b.timestampFormatted - a.timestampFormatted);

        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        console.warn("Notifications listener error (falling back to raw query):", error);
        onSnapshot(notifsRef, (rawSnap) => {
          const list = rawSnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              timestampFormatted: new Date(data.timestamp || Date.now()),
              relativeTime: formatRelativeTime(data.timestamp || Date.now()),
            };
          });
          list.sort((a, b) => b.timestampFormatted - a.timestampFormatted);
          setNotifications(list);
          setLoading(false);
        });
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Derived Metrics
  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  // Type Counts
  const typeCounts = {
    all: notifications.length,
    order_update: notifications.filter((n) => n.type === "order_update").length,
    message: notifications.filter((n) => n.type === "message").length,
    promotion: notifications.filter((n) => n.type === "promotion").length,
    follower: notifications.filter((n) => n.type === "follower").length,
    system: notifications.filter((n) => n.type === "system").length,
    test: notifications.filter((n) => n.type === "test").length,
  };

  // Filtered Notifications List
  const filteredNotifications = notifications.filter((notif) => {
    // 1. Tab filter
    if (activeTab === "unread" && notif.read) return false;

    // 2. Type filter
    if (selectedType !== "all" && notif.type !== selectedType) return false;

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = notif.title?.toLowerCase().includes(q);
      const msgMatch = notif.message?.toLowerCase().includes(q);
      const senderMatch = notif.sender?.toLowerCase().includes(q);
      if (!titleMatch && !msgMatch && !senderMatch) return false;
    }

    return true;
  });

  // Handle Mark All As Read Batch Action
  const handleMarkAllRead = async () => {
    if (!user?.uid || unreadCount === 0) return;

    // Optimistic UI Update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await markAllNotificationsAsRead(user.uid, unreadIds);
      toast.success("All notifications marked as read!");
    } catch (err) {
      console.error("Error marking all read:", err);
      toast.error("Failed to update notifications status.");
    }
  };

  // Handle Mark Single Card as Read
  const handleCardClick = async (notif) => {
    if (!user?.uid) return;

    if (!notif.read) {
      // Optimistic Update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      markNotificationAsRead(user.uid, notif.id).catch((e) => console.warn("Read update error:", e));
    }
  };

  // Handle Card Delete
  const handleDeleteCard = async (e, notifId) => {
    e.stopPropagation();
    if (!user?.uid) return;

    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await deleteNotification(user.uid, notifId);
      toast.success("Notification deleted.");
    } catch (err) {
      toast.error("Failed to delete notification.");
    }
  };

  // Dispatch Test Notification
  const handleSendTestNotification = async (e) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error("You must be logged in to test notifications.");
      return;
    }

    setIsSendingTest(true);
    const toastId = toast.loading("Dispatching multi-channel test notification...");

    try {
      await addNotification({
        to: user.uid,
        title: testTitle.trim() || "Test Multi-Channel Notification",
        message: testMessage.trim() || "Real-time in-app notification delivered successfully.",
        type: testType,
        sender: "Thikana Notification Hub",
        whatsapp: testWhatsApp,
        email: testEmail,
        link: "/profile/notifications",
      });

      toast.success("Test notification dispatched! Check your list above.", { id: toastId });
    } catch (err) {
      console.error("Error sending test notification:", err);
      toast.error(`Failed to send test notification: ${err.message}`, { id: toastId });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] dark:border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center animate-pulse shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Notifications & Alerts
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Real-time in-app order updates, customer inquiries, and system alerts
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-extrabold text-xs transition shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Control Panel: Search Bar, Tabs, & Type Filter */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs: All vs Unread */}
          <div className="inline-flex rounded-2xl p-1 bg-[#F2EFE9] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <span>All Notifications</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/20 text-[10px]">
                {typeCounts.all}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                activeTab === "unread"
                  ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, message, or sender..."
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
            />
          </div>

          {/* Type Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 text-xs font-bold text-[#1A1A1A] dark:text-white hover:bg-gray-200 transition flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span className="capitalize">
                  {selectedType === "all" ? "All Types" : TYPE_CONFIG[selectedType]?.label || selectedType}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showTypeDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-1 z-30 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType("all");
                    setShowTypeDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    selectedType === "all"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <span>All Notification Types</span>
                  <span className="text-[10px] text-gray-400">{typeCounts.all}</span>
                </button>

                {Object.entries(TYPE_CONFIG).map(([tKey, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => {
                        setSelectedType(tKey);
                        setShowTypeDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        selectedType === tKey
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-3.5 h-3.5 ${config.iconColor}`} />
                        <span>{config.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{typeCounts[tKey] || 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-500">Loading your real-time notification stream...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-12 text-center space-y-3 shadow-xs">
          <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="font-extrabold text-sm text-[#1A1A1A] dark:text-white">No Notifications Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {activeTab === "unread"
              ? "You have zero unread notifications. You're all caught up!"
              : "No notification alerts match your filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
            const IconComponent = config.icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleCardClick(notif)}
                className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                  !notif.read
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-500/30 shadow-xs"
                    : "bg-white dark:bg-[#1A1A1A] border-[#E5E0D8] dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                {!notif.read && (
                  <span className="absolute top-4 left-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`p-3 rounded-2xl ${config.badgeBg} ${config.badgeText} shrink-0`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-[#1A1A1A] dark:text-white">
                          {notif.sender || "Thikana System"}
                        </span>
                        <span className="text-[10px] text-gray-400">•</span>
                        <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {notif.relativeTime}
                        </span>

                        {/* Multi-Channel Badges */}
                        {notif.whatsapp && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                            <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                          </span>
                        )}
                        {notif.email && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase">
                            <Mail className="w-2.5 h-2.5" /> Email
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-white">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.link && (
                        <div className="pt-2">
                          <Link
                            href={notif.link}
                            className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>View Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteCard(e, notif.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 opacity-0 group-hover:opacity-100"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE TEST NOTIFICATION PANEL AT BOTTOM                  */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-[#111827] via-[#1E293B] to-[#0F172A] text-white rounded-3xl border border-white/10 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">
              Omni-Channel Test Notification Panel
            </h3>
            <p className="text-xs text-slate-300">
              Dispatch a test message to verify real-time In-App, WhatsApp, and Email pipelines
            </p>
          </div>
        </div>

        <form onSubmit={handleSendTestNotification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Notification Title
              </label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Special Order Update"
                className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Notification Category
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-rose-400"
              >
                <option value="order_update">Order Update</option>
                <option value="message">Message / Inquiry</option>
                <option value="promotion">Promotion / Deal</option>
                <option value="follower">Follower Activity</option>
                <option value="system">System Alert</option>
                <option value="test">Test Event</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Notification Message
            </label>
            <textarea
              rows={2}
              required
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter message details..."
              className="w-full bg-white/10 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-slate-400 outline-none focus:border-rose-400 resize-none"
            />
          </div>

          {/* Multi-Channel Dispatch Checkboxes */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={testWhatsApp}
                onChange={(e) => setTestWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Dispatch WhatsApp Alert
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={testEmail}
                onChange={(e) => setTestEmail(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400"
              />
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" /> Dispatch Email Alert
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSendingTest}
            className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            {isSendingTest ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Test Notification...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send Test Multi-Channel Notification
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NotificationsPage;
