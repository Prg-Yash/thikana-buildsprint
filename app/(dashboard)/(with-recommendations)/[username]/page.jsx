"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { PostCard } from "@/components/PostCard";
import {
  MapPin,
  CheckCircle2,
  UserPlus,
  UserCheck,
  PhoneCall,
  Navigation,
  Clock,
  Store,
  Grid,
  ShoppingBag,
  Info,
  Calendar,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export default function StorefrontPage({ params }) {
  const unwrappedParams = use(params);
  const username = unwrappedParams?.username || "";

  const [storeData, setStoreData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "products" | "info"
  const [isFollowing, setIsFollowing] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    async function loadStorefrontData() {
      setLoading(true);
      try {
        let fetchedStore = null;

        // Query Firestore `users` or `businesses` collection
        const qUsers = query(collection(db, "users"), where("username", "==", username));
        const userSnap = await getDocs(qUsers);

        if (!userSnap.empty) {
          const uDoc = userSnap.docs[0].data();
          fetchedStore = { id: userSnap.docs[0].id, ...uDoc };
        } else {
          // Check `businesses` collection
          const qBiz = query(collection(db, "businesses"), where("username", "==", username));
          const bizSnap = await getDocs(qBiz);
          if (!bizSnap.empty) {
            const bDoc = bizSnap.docs[0].data();
            fetchedStore = { id: bizSnap.docs[0].id, ...bDoc };
          }
        }

        setStoreData(fetchedStore);

        // Fetch business posts
        try {
          const postsQuery = query(
            collection(db, "posts"),
            where("username", "==", username)
          );
          const postSnap = await getDocs(postsQuery);
          if (!postSnap.empty) {
            setPosts(postSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          }
        } catch {
          // Ignore query failure
        }
      } catch (err) {
        console.error("Error loading storefront:", err);
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      loadStorefrontData();
    }
  }, [username]);

  const handleOpenDirections = () => {
    if (storeData?._geoloc) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${storeData._geoloc.lat},${storeData._geoloc.lng}`;
      window.open(url, "_blank");
    } else {
      toast.error("Store location coordinates not available.");
    }
  };

  const handleRequestCall = (e) => {
    e.preventDefault();
    if (!phoneNumber) return;
    toast.success("Call request submitted!");
    setCallModalOpen(false);
    setPhoneNumber("");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="w-full h-48 sm:h-64 rounded-3xl bg-gray-200 dark:bg-gray-800" />
        <div className="flex items-center gap-4 px-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 border-4 border-white dark:border-[#1A1A1A] -mt-10" />
          <div className="space-y-2">
            <div className="w-40 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="w-24 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
        <Store className="w-10 h-10 text-gray-400 mx-auto" />
        <h2 className="text-lg font-black text-[#1A1A1A] dark:text-white">Store Not Found</h2>
        <p className="text-xs text-gray-500">No registered merchant found with handle @{username}.</p>
        <Link href="/feed" className="inline-block px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold">
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Cover Banner & Logo */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 overflow-hidden shadow-sm">
        <div className="relative h-48 sm:h-64 bg-gray-200 dark:bg-gray-800">
          {storeData?.coverImage && (
            <Image
              src={storeData.coverImage}
              alt={storeData?.name || "Store Cover"}
              fill
              className="object-cover"
            />
          )}
        </div>

        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-[#1A1A1A] bg-[#1A1A1A] text-white overflow-hidden shadow-md shrink-0 flex items-center justify-center font-black text-2xl">
                {storeData?.logo ? (
                  <Image
                    src={storeData.logo}
                    alt={storeData?.name || "Store Logo"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>{(storeData?.name || "S").charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
                    {storeData?.name}
                  </h1>
                  {storeData?.isVerified && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">@{storeData?.username}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isFollowing
                    ? "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200"
                    : "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90"
                }`}
              >
                {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isFollowing ? "Following" : "Follow"}</span>
              </button>

              <button
                onClick={handleOpenDirections}
                className="px-4 py-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold text-[#1A1A1A] dark:text-white transition flex items-center gap-1.5"
              >
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>Get Directions</span>
              </button>

              <button
                onClick={() => setCallModalOpen(true)}
                className="p-2.5 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 transition"
                title="Request Call"
              >
                <PhoneCall className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
            {storeData?.bio}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium pt-3 border-t border-[#E5E0D8] dark:border-white/10">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {storeData?.address}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {storeData?.operatingHours}
            </span>
            <span className="font-bold text-[#1A1A1A] dark:text-white">
              {storeData?.followersCount || 0} Followers
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E5E0D8] dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "posts"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Posts Feed ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "products"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Products</span>
        </button>

        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "info"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Store Info</span>
        </button>
      </div>

      {/* 3. Tab Content */}
      <div className="space-y-4">
        {activeTab === "posts" && (
          posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500">
              No store updates published yet.
            </div>
          )
        )}

        {activeTab === "products" && (
          <div className="p-8 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500 space-y-2">
            <ShoppingBag className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="font-bold text-[#1A1A1A] dark:text-white">Store Catalog</p>
            <p>Products from this store will appear here.</p>
          </div>
        )}

        {activeTab === "info" && (
          <div className="p-6 bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Business Address</h3>
              <p className="text-gray-600 dark:text-gray-300">{storeData?.address}</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Operating Hours</h3>
              <p className="text-gray-600 dark:text-gray-300">{storeData?.operatingHours}</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Contact Phone</h3>
              <p className="text-gray-600 dark:text-gray-300">{storeData?.phone}</p>
            </div>
          </div>
        )}
      </div>

      {/* Call Modal */}
      {callModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-sm w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative">
            <button
              onClick={() => setCallModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-black text-base">Request Callback</h3>
            <form onSubmit={handleRequestCall} className="space-y-3">
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] rounded-xl p-3 text-xs outline-none"
              />
              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
