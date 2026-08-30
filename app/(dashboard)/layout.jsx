"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { BusinessProvider } from "@/context/BusinessContext";
import { LocationAlertProvider, useLocationAlert } from "@/context/LocationAlertContext";
import Image from "next/image";
import {
  Home,
  Compass,
  BarChart3,
  PlusSquare,
  ShoppingBag,
  Package,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  ShoppingCart,
  User,
  LogOut,
  MapPin,
  AlertTriangle,
  X,
  Menu,
  Globe,
  Store,
  Bot,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Home Feed", href: "/feed", icon: Home },
  { name: "Discover / Map", href: "/map", icon: Compass },
  { name: "Notifications", href: "/profile/notifications", icon: Bell },
  { name: "Business Profile", href: "/profile", icon: User },
  { name: "Analytics Dashboard", href: "/profile/analytics", icon: BarChart3 },
  { name: "Inventory Management", href: "/profile/inventory", icon: Package },
  { name: "Store Services", href: "/profile/services", icon: Wrench },
  { name: "Create Post", href: "/posts/create", icon: PlusSquare },
  { name: "Website Builder", href: "/websites", icon: Globe },
  { name: "Business Dashboard", href: "/business-dashboard", icon: Store },
  { name: "Settings", href: "/profile/settings", icon: Settings },
];

function GeoAlertBanner() {
  const { alertVisible, dismissAlert } = useLocationAlert();

  if (!alertVisible) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          <strong>Store location missing:</strong> Set your store geo-coordinates on the map so local customers can discover your shop.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/map"
          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
        >
          <MapPin className="w-3.5 h-3.5" />
          Set Location
        </Link>
        <button
          onClick={dismissAlert}
          className="p-1 text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-100 transition"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function DashboardContent({ children }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (pathname !== "/search") {
      router.push(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
    } else if (searchQuery.trim()) {
      router.replace(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] dark:bg-[#121212] text-[#1A1A1A] dark:text-gray-100 flex flex-col font-sans">
      {/* 4. Top Geo Alert Banner */}
      <GeoAlertBanner />

      <div className="flex flex-1 relative">
        {/* 1. Desktop Sticky & Collapsible Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 80 : 256 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="hidden md:flex flex-col sticky top-0 h-screen bg-white dark:bg-[#1A1A1A] border-r border-[#E5E0D8] dark:border-white/10 z-30 shadow-sm"
        >
          {/* Sidebar Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#E5E0D8] dark:border-white/10">
            <Link href="/feed" className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-2xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] flex items-center justify-center font-black text-lg shrink-0">
                T
              </div>
              {!collapsed && (
                <span
                  className="font-extrabold text-xl tracking-tight whitespace-nowrap text-[#1A1A1A] dark:text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Thikana
                </span>
              )}
            </Link>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-xl border border-[#DDD8CF] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3 py-3 rounded-2xl text-sm font-semibold transition-colors ${isActive
                    ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-[#EEEAE4] dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white"
                    }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer User Info */}
          {!collapsed && user && (
            <Link
              href="/profile"
              className="p-4 border-t border-[#E5E0D8] dark:border-white/10 bg-[#FBF9F5] dark:bg-[#161616] hover:bg-[#EEEAE4] dark:hover:bg-white/5 transition block"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                  {(user?.profilePic || user?.photoURL) ? (
                    <Image
                      src={user.profilePic || user.photoURL}
                      alt={user?.displayName || "User"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span>{user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-[#1A1A1A] dark:text-white">
                    {user?.displayName || user?.name || user?.businessName || "User"}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            </Link>
          )}
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 2. Top Navigation Bar */}
          <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-md border-b border-[#E5E0D8] dark:border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4">
            {/* Mobile Menu Toggle & Search Bar */}
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-xl border border-[#DDD8CF] dark:border-white/10 text-gray-700 dark:text-gray-200"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (pathname !== "/search") {
                      router.push(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (pathname === "/search") {
                      router.replace(val.trim() ? `/search?q=${encodeURIComponent(val.trim())}` : "/search");
                    }
                  }}
                  placeholder="Search local businesses, stores, products..."
                  className="w-full bg-[#F2EFE9] dark:bg-[#262626] border border-transparent focus:border-[#1A1A1A] dark:focus:border-white/20 rounded-2xl py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white placeholder-gray-400 outline-none transition"
                />
              </form>
            </div>

            {/* Right Top Bar Icons & Profile Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <Link
                href="/profile/notifications"
                className="p-2.5 rounded-2xl border border-[#DDD8CF] dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              </Link>

              {/* Cart Trigger */}
              <Link
                href="/cart"
                className="p-2.5 rounded-2xl border border-[#DDD8CF] dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition relative"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="w-4 h-4" />
              </Link>

              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-2xl border border-[#DDD8CF] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  <div className="relative w-7 h-7 rounded-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center text-xs font-bold overflow-hidden">
                    {(user?.profilePic || user?.photoURL) ? (
                      <Image
                        src={user.profilePic || user.photoURL}
                        alt={user?.displayName || "User"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span>{user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}</span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-[#1A1A1A] dark:text-white max-w-25 truncate">
                    {user?.displayName || user?.name || user?.businessName || "Account"}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-white/10">
                      <p className="text-xs font-bold text-[#1A1A1A] dark:text-white truncate">
                        {user?.displayName || user?.name || user?.businessName || "User"}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </Link>

                    {user?.username && (
                      <Link
                        href={`/store/${user.username}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                      >
                        <Store className="w-4 h-4 text-emerald-600" />
                        View Public Store
                      </Link>
                    )}
                    <Link
                      href="/profile/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition border-t border-gray-100 dark:border-white/10"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Children Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {/* 3. Responsive Mobile Bottom Sheet / Drawer Navigation */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 md:hidden backdrop-blur-xs"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1A1A1A] rounded-t-3xl border-t border-[#E5E0D8] dark:border-white/10 p-6 md:hidden shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6" />

              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-black text-sm">
                    T
                  </div>
                  <span className="font-extrabold text-lg text-[#1A1A1A] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
                    Navigation
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${isActive
                        ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
                        : "bg-[#F7F6F3] dark:bg-[#252525] text-gray-700 dark:text-gray-200"
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  logout();
                }}
                className="w-full py-3.5 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] dark:bg-[#121212] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1A1A1A] dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BusinessProvider>
      <LocationAlertProvider>
        <DashboardContent>{children}</DashboardContent>
      </LocationAlertProvider>
    </BusinessProvider>
  );
}
