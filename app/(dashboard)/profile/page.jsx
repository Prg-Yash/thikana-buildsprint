"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  documentId,
} from "firebase/firestore";
import { PostCard } from "@/components/PostCard";
import {
  User,
  Settings,
  MapPin,
  CheckCircle2,
  Bookmark,
  Grid,
  Store,
  Calendar,
  Phone,
  Mail,
  PlusSquare,
} from "lucide-react";

// Safe date formatter supporting Firestore Timestamps, ISO strings, and JS Dates
function formatDateSafely(val) {
  if (!val) return "Recently";
  try {
    let d = null;
    if (typeof val === "object" && typeof val.seconds === "number") {
      d = new Date(val.seconds * 1000);
    } else if (typeof val === "string" || typeof val === "number") {
      d = new Date(val);
    }
    if (d && !isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  } catch {
    // Ignore error
  }
  return "Recently";
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "saved" | "business"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserProfile() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // 1. Fetch user doc & business doc from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        let uData = {};
        if (userSnap.exists()) {
          uData = userSnap.data();
        }

        let bData = null;
        try {
          const bizDocRef = doc(db, "businesses", user.uid);
          const bizSnap = await getDoc(bizDocRef);
          if (bizSnap.exists()) {
            bData = bizSnap.data();
            setBusinessData(bData);
          } else {
            const qBiz = query(collection(db, "businesses"), where("adminId", "==", user.uid));
            const bizQuerySnap = await getDocs(qBiz);
            if (!bizQuerySnap.empty) {
              bData = bizQuerySnap.docs[0].data();
              setBusinessData(bData);
            }
          }
        } catch (e) {
          console.warn("Could not fetch business info:", e.message);
        }

        setProfileData({
          displayName: uData.name || uData.displayName || bData?.businessName || user.displayName || "User",
          email: uData.email || bData?.email || user.email,
          username: uData.username || bData?.username || (user.displayName ? user.displayName.toLowerCase().replace(/\s+/g, "-") : "user"),
          phone: uData.phone || bData?.phone || "",
          accountType: uData.role || uData.accountType || (bData ? "Business" : "Shopper"),
          avatar: uData.profilePic || uData.avatar || bData?.profilePic || user.photoURL || "",
          createdAtFormatted: formatDateSafely(uData.createdAt),
        });

        const defaultBizName = uData.name || uData.displayName || bData?.businessName || "Local Merchant";
        const defaultBizAvatar = uData.profilePic || uData.avatar || bData?.profilePic || "";
        const defaultUsername = uData.username || bData?.username || "store";

        const normalizePostDoc = (id, data) => {
          const images =
            data.images && data.images.length > 0
              ? data.images
              : data.mediaUrl
              ? [data.mediaUrl]
              : data.imageUrl
              ? [data.imageUrl]
              : [];

          const caption = data.caption || data.content || data.description || "";
          const likeCount =
            typeof data.likeCount === "number"
              ? data.likeCount
              : typeof data.likesCount === "number"
              ? data.likesCount
              : typeof data.likes === "number"
              ? data.likes
              : data.interactions?.likeCount || 0;

          const commentCount =
            typeof data.commentCount === "number"
              ? data.commentCount
              : typeof data.commentsCount === "number"
              ? data.commentsCount
              : 0;

          return {
            id,
            ...data,
            businessName: data.businessName || defaultBizName,
            businessAvatar: data.businessAvatar || defaultBizAvatar,
            username: data.username || defaultUsername,
            caption,
            images,
            category: data.category || data.businessType || "General",
            likeCount,
            commentCount,
            isVerified: true,
          };
        };

        // 3. Multi-key published post queries (`uid`, `userId`, `businessId`, `authorId`)
        try {
          const postsMap = new Map();
          const queryKeys = ["uid", "userId", "businessId", "authorId"];

          for (const key of queryKeys) {
            try {
              const q = query(collection(db, "posts"), where(key, "==", user.uid));
              const snap = await getDocs(q);
              snap.docs.forEach((d) => postsMap.set(d.id, normalizePostDoc(d.id, d.data())));
            } catch {
              // Ignore single key error
            }
          }

          setUserPosts(Array.from(postsMap.values()));
        } catch (e) {
          console.warn("Could not fetch user published posts:", e.message);
        }

        // 4. Batch saved/bookmarked posts fetching
        try {
          const bookmarkSnap = await getDocs(
            collection(db, "users", user.uid, "bookmarks")
          );
          const bookmarkPostIds = bookmarkSnap.docs.map((d) => d.data().postId || d.id);

          if (bookmarkPostIds.length > 0) {
            const savedList = [];
            // Batch fetch in chunks of 10
            for (let i = 0; i < bookmarkPostIds.length; i += 10) {
              const chunk = bookmarkPostIds.slice(i, i + 10);
              const qSaved = query(
                collection(db, "posts"),
                where(documentId(), "in", chunk)
              );
              const savedSnap = await getDocs(qSaved);
              savedSnap.docs.forEach((d) => {
                savedList.push(normalizePostDoc(d.id, d.data()));
              });
            }
            setSavedPosts(savedList);
          }
        } catch (e) {
          console.warn("Could not fetch bookmarked posts:", e.message);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [user]);

  const handlePostDeleted = (deletedId) => {
    setUserPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="w-full h-40 rounded-3xl bg-gray-200 dark:bg-gray-800" />
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Profile Header Card */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 overflow-hidden shadow-sm">
        <div className="relative h-36 sm:h-48 bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#C8B99A]/30">
          {businessData?.coverPic && (
            <Image
              src={businessData.coverPic}
              alt="Cover"
              fill
              className="object-cover opacity-80"
            />
          )}
        </div>

        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-[#1A1A1A] bg-[#1A1A1A] text-white overflow-hidden shadow-md shrink-0 flex items-center justify-center font-black text-2xl">
                {profileData?.avatar ? (
                  <Image
                    src={profileData.avatar}
                    alt={profileData?.displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>{profileData?.displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1
                    className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {profileData?.displayName}
                  </h1>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                </div>
                <p className="text-xs text-gray-500 font-medium">@{profileData?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile/settings"
                className="px-4 py-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold text-[#1A1A1A] dark:text-white transition flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Profile</span>
              </Link>

              {businessData?.username && (
                <Link
                  href={`/${businessData.username}`}
                  className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Store className="w-4 h-4" />
                  <span>View Public Store</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium pt-3 border-t border-[#E5E0D8] dark:border-white/10">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              {profileData?.email}
            </span>

            {profileData?.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {profileData.phone}
              </span>
            )}

            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Joined {profileData?.createdAtFormatted}
            </span>

            <span className="px-2.5 py-0.5 rounded-full bg-[#F4F1EA] dark:bg-white/10 text-[#1A1A1A] dark:text-gray-200 font-bold uppercase text-[10px]">
              {profileData?.accountType}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-4 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A] dark:text-white">{userPosts.length}</p>
            <p className="text-[11px] text-gray-500 font-medium">Published Posts</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-4 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A] dark:text-white">{savedPosts.length}</p>
            <p className="text-[11px] text-gray-500 font-medium">Saved Bookmarks</p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#1A1A1A] rounded-2xl p-4 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A] dark:text-white">
              {businessData?.businessName ? "Verified" : "Personal"}
            </p>
            <p className="text-[11px] text-gray-500 font-medium">Account Status</p>
          </div>
        </div>
      </div>

      {/* 3. Tab Bar Navigation */}
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
          <span>My Posts ({userPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "saved"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Posts ({savedPosts.length})</span>
        </button>

        {businessData && (
          <button
            onClick={() => setActiveTab("business")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
              activeTab === "business"
                ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
                : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store Details</span>
          </button>
        )}
      </div>

      {/* 4. Tab Content */}
      <div className="space-y-4">
        {activeTab === "posts" && (
          userPosts.length > 0 ? (
            userPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.uid}
                onDelete={handlePostDeleted}
              />
            ))
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
              <PlusSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">No Published Posts</h3>
              <p className="text-xs text-gray-500">You haven't published any store updates or offers yet.</p>
              <Link
                href="/posts/create"
                className="inline-block px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold"
              >
                Create Your First Post
              </Link>
            </div>
          )
        )}

        {activeTab === "saved" && (
          savedPosts.length > 0 ? (
            savedPosts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.uid} />
            ))
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
              <Bookmark className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">No Saved Posts</h3>
              <p className="text-xs text-gray-500">Posts you bookmark from the feed will appear here for easy access.</p>
            </div>
          )
        )}

        {activeTab === "business" && businessData && (
          <div className="p-6 bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-5 text-xs">
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Business Name</h3>
              <p className="text-gray-600 dark:text-gray-300">{businessData.businessName}</p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Category & Type</h3>
              <p className="text-gray-600 dark:text-gray-300">{businessData.business_type || "Retail Store"}</p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Location Address</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {businessData.locationAddress || businessData.address?.formatted || "Not set yet"}
              </p>
              <Link href="/map" className="inline-flex items-center gap-1 text-emerald-600 font-bold mt-1">
                <MapPin className="w-3.5 h-3.5" /> Calibrate on Map
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
