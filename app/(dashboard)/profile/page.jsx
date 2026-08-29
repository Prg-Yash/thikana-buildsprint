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
  setDoc,
  deleteDoc,
  documentId,
  serverTimestamp,
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
  Users,
  Image as ImageIcon,
  ShoppingBag,
  Home as HomeIcon,
  Briefcase,
  Star,
  Edit2,
  X,
  Check,
  Building2,
  FileText,
  ShieldCheck,
  Clock,
  Trash2,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";

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
  const [userProducts, setUserProducts] = useState([]);
  const [userServices, setUserServices] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [userProperties, setUserProperties] = useState([]);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab View: "posts" | "saved" | "products" | "services" | "photos" | "orders" | "properties" | "business"
  const [activeTab, setActiveTab] = useState("posts");

  // Dialog States
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false);
  const [businessDetailsDialogOpen, setBusinessDetailsDialogOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  // Direct Edit Profile Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editBizName, setEditBizName] = useState("");
  const [editBizType, setEditBizType] = useState("Retail");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    async function loadUserProfile() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // 1. Fetch user doc & business doc
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
          bio: uData.bio || uData.about || bData?.description || "Verified store account on Thikana.",
          accountType: uData.role || uData.accountType || (bData ? "Business" : "Shopper"),
          avatar: uData.profilePic || uData.avatar || bData?.profilePic || user.photoURL || "",
          createdAtFormatted: formatDateSafely(uData.createdAt),
        });

        // Initialize Edit Form
        setEditName(uData.name || uData.displayName || bData?.businessName || user.displayName || "");
        setEditPhone(uData.phone || bData?.phone || "");
        setEditBio(uData.bio || uData.about || "");
        setEditBizName(bData?.businessName || "");
        setEditBizType(bData?.business_type || "Retail");

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

        // 2. Fetch User Published Posts
        try {
          const postsMap = new Map();
          const queryKeys = ["uid", "userId", "businessId", "authorId"];

          for (const key of queryKeys) {
            try {
              const q = query(collection(db, "posts"), where(key, "==", user.uid));
              const snap = await getDocs(q);
              snap.docs.forEach((d) => postsMap.set(d.id, normalizePostDoc(d.id, d.data())));
            } catch {
              // Ignore
            }
          }

          const myPosts = Array.from(postsMap.values());
          setUserPosts(myPosts);

          // Extract photos from posts for Photos tab
          const photosList = [];
          myPosts.forEach((p) => {
            if (p.images && p.images.length > 0) {
              p.images.forEach((url, idx) => {
                photosList.push({ id: `${p.id}_${idx}`, url, caption: p.caption, postId: p.id });
              });
            }
          });
          setUserPhotos(photosList);
        } catch (e) {
          console.warn("Could not fetch user published posts:", e.message);
        }

        // 3. Batch Saved/Bookmarked Posts
        try {
          const bookmarkSnap = await getDocs(
            collection(db, "users", user.uid, "bookmarks")
          );
          const bookmarkPostIds = bookmarkSnap.docs.map((d) => d.data().postId || d.id);

          if (bookmarkPostIds.length > 0) {
            const savedList = [];
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

        // 4. Fetch Products Catalog & Ratings
        try {
          const prodSnap = await getDocs(collection(db, "users", user.uid, "products"));
          const prodsList = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setUserProducts(prodsList);
        } catch {
          // Ignore
        }

        // 5. Fetch Services Catalog
        try {
          const servSnap = await getDocs(collection(db, "users", user.uid, "services"));
          const servsList = servSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setUserServices(servsList);
        } catch {
          // Ignore
        }

        // 6. Fetch Orders History
        try {
          const ordSnap = await getDocs(
            query(collection(db, "orders"), where("userId", "==", user.uid))
          );
          if (!ordSnap.empty) {
            setUserOrders(ordSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          }
        } catch {
          // Ignore
        }

        // 7. Fetch Followers & Following
        try {
          const followersSnap = await getDocs(collection(db, "businesses", user.uid, "followers"));
          if (!followersSnap.empty) {
            setFollowersList(followersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          }

          const followingSnap = await getDocs(collection(db, "users", user.uid, "following"));
          if (!followingSnap.empty) {
            setFollowingList(followingSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          }
        } catch {
          // Ignore
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

  const handleSaveDirectProfileEdit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    setSavingProfile(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          name: editName.trim(),
          displayName: editName.trim(),
          phone: editPhone.trim(),
          bio: editBio.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (editBizName.trim()) {
        const bizRef = doc(db, "businesses", user.uid);
        await setDoc(
          bizRef,
          {
            businessName: editBizName.trim(),
            business_type: editBizType,
            phone: editPhone.trim(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setProfileData((prev) => ({
        ...prev,
        displayName: editName.trim(),
        phone: editPhone.trim(),
        bio: editBio.trim(),
      }));

      setEditProfileModalOpen(false);
      toast.success("Profile details updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="w-full h-44 rounded-3xl bg-gray-200 dark:bg-gray-800" />
        <div className="flex items-center gap-4 px-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 border-4 border-white dark:border-[#1A1A1A] -mt-12" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="w-28 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* 1. Profile Header & Identity Banner */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 overflow-hidden shadow-sm">
        <div className="relative h-40 sm:h-52 bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#C8B99A]/30">
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
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
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

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEditProfileModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold text-[#1A1A1A] dark:text-white transition flex items-center gap-1.5"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>

              {businessData && (
                <button
                  onClick={() => setBusinessDetailsDialogOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold text-[#1A1A1A] dark:text-white transition flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>Business Info</span>
                </button>
              )}

              {businessData?.username && (
                <Link
                  href={`/${businessData.username}`}
                  className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Store className="w-4 h-4" />
                  <span>Public Store</span>
                </Link>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
            {profileData?.bio}
          </p>

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

            {businessData?.activeWebsiteId && (
              <Link
                href={`/site/${businessData.activeWebsiteId}`}
                target="_blank"
                className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                <Store className="w-3.5 h-3.5" /> Live Store Website
              </Link>
            )}

            {Array.isArray(businessData?.socialMediaLinks) &&
              businessData.socialMediaLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-600 font-bold hover:underline"
                >
                  <span>{link.platform}: {link.url.replace("https://", "")}</span>
                </a>
              ))}

            <span className="px-2.5 py-0.5 rounded-full bg-[#F4F1EA] dark:bg-white/10 text-[#1A1A1A] dark:text-gray-200 font-bold uppercase text-[10px]">
              {profileData?.accountType}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Stat Counters (Triggers Followers / Following Dialogs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-4 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A] dark:text-white">{userPosts.length}</p>
            <p className="text-[11px] text-gray-500 font-medium">Published Posts</p>
          </div>
        </div>

        <button
          onClick={() => setFollowersDialogOpen(true)}
          className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-4 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-center gap-3 hover:border-emerald-500 text-left transition"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A] dark:text-white">{followersList.length}</p>
            <p className="text-[11px] text-gray-500 font-medium">Followers</p>
          </div>
        </button>

        <button
          onClick={() => setFollowingDialogOpen(true)}
          className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-4 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-center gap-3 hover:border-purple-500 text-left transition"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A] dark:text-white">{followingList.length}</p>
            <p className="text-[11px] text-gray-500 font-medium">Following</p>
          </div>
        </button>

        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-4 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A] dark:text-white">{savedPosts.length}</p>
            <p className="text-[11px] text-gray-500 font-medium">Saved Bookmarks</p>
          </div>
        </div>
      </div>

      {/* 3. Rich Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E5E0D8] dark:border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "posts"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Posts ({userPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "products"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Products ({userProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "services"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Services ({userServices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("photos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "photos"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Photos Gallery ({userPhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "saved"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved ({savedPosts.length})</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      <div className="space-y-4">
        {/* Posts Tab */}
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

        {/* Products & Ratings Tab */}
        {activeTab === "products" && (
          userProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userProducts.map((prod) => (
                <div key={prod.id} className="p-4 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 space-y-3 shadow-sm">
                  {prod.imageUrl && (
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image src={prod.imageUrl} alt={prod.name} fill className="object-cover" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{prod.category || "General"}</span>
                    <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-white">{prod.name}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
                    <span className="font-black text-sm text-[#1A1A1A] dark:text-white">₹{prod.price || 0}</span>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>
                        {typeof prod.ratings === "number" || typeof prod.ratings === "string"
                          ? prod.ratings
                          : typeof prod.ratings === "object" && prod.ratings?.average !== undefined
                          ? prod.ratings.average
                          : "4.8"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500 space-y-2">
              <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-bold text-[#1A1A1A] dark:text-white">No Catalog Products</p>
              <Link href="/profile/inventory" className="inline-block px-3.5 py-1.5 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold">Manage Inventory</Link>
            </div>
          )
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          userServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userServices.map((serv) => (
                <div key={serv.id} className="p-4 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 space-y-3 shadow-sm">
                  {serv.imageUrl && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image src={serv.imageUrl} alt={serv.title || serv.name} fill className="object-cover" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{serv.category || "General"}</span>
                    <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-white">{serv.title || serv.name}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
                    <span className="font-black text-sm text-[#1A1A1A] dark:text-white">₹{serv.price || 0}</span>
                    <span className="text-xs font-bold text-gray-400">{serv.duration || 30} Mins</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500 space-y-2">
              <Wrench className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-bold text-[#1A1A1A] dark:text-white">No Services Configured</p>
              <Link href="/profile/services" className="inline-block px-3.5 py-1.5 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold">Manage Services</Link>
            </div>
          )
        )}

        {/* Photos Gallery Tab */}
        {activeTab === "photos" && (
          userPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {userPhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group border border-[#E5E0D8] dark:border-white/10">
                  <Image src={photo.url} alt="Gallery Photo" fill className="object-cover transition-transform group-hover:scale-105" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500 space-y-2">
              <ImageIcon className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-bold text-[#1A1A1A] dark:text-white">No Photo Media</p>
              <p>Photos attached to your posts will automatically appear in your gallery.</p>
            </div>
          )
        )}

        {/* Saved Bookmarks Tab */}
        {activeTab === "saved" && (
          savedPosts.length > 0 ? (
            savedPosts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.uid} />
            ))
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
              <Bookmark className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">No Saved Bookmarks</h3>
              <p className="text-xs text-gray-500">Posts you bookmark from the feed will appear here.</p>
            </div>
          )
        )}
      </div>

      {/* DIALOG 1: Followers List Dialog */}
      {followersDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-sm w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative">
            <button
              onClick={() => setFollowersDialogOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-black text-base text-[#1A1A1A] dark:text-white">Store Followers</h3>

            {followersList.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No followers yet.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {followersList.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 text-xs p-2 rounded-xl bg-[#F7F6F3] dark:bg-[#222]">
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold">
                      {(f.name || "U").charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[#1A1A1A] dark:text-white">{f.name || "Follower"}</p>
                      <p className="text-[10px] text-gray-400">Nearby Shopper</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIALOG 2: Following List Dialog */}
      {followingDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-sm w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative">
            <button
              onClick={() => setFollowingDialogOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-black text-base text-[#1A1A1A] dark:text-white">Following Merchants</h3>

            {followingList.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">You are not following any stores yet.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {followingList.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 text-xs p-2 rounded-xl bg-[#F7F6F3] dark:bg-[#222]">
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold">
                      {(f.businessId || "S").charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[#1A1A1A] dark:text-white">Store {f.businessId}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">Following</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIALOG 3: Full Business Details & GST/PAN License Dialog */}
      {businessDetailsDialogOpen && businessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-md w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative text-xs">
            <button
              onClick={() => setBusinessDetailsDialogOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-black text-base text-[#1A1A1A] dark:text-white">Verified Business Entity</h3>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <p className="font-bold text-gray-400 text-[10px] uppercase">Business Legal Name</p>
                <p className="font-bold text-sm text-[#1A1A1A] dark:text-white">{businessData.businessName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-bold text-gray-400 text-[10px] uppercase">GSTIN Number</p>
                  <p className="font-bold text-[#1A1A1A] dark:text-white">{businessData.gstinNumber || "Regular GST"}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-400 text-[10px] uppercase">PAN Verification</p>
                  <p className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold text-gray-400 text-[10px] uppercase">Registered Location Address</p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {businessData.locationAddress || businessData.address?.formatted}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 4: Direct Profile Edit Modal */}
      {editProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-md w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative text-xs">
            <button
              onClick={() => setEditProfileModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-black text-base text-[#1A1A1A] dark:text-white">Edit Profile Details</h3>

            <form onSubmit={handleSaveDirectProfileEdit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bio / Store Info</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] rounded-xl p-2.5 outline-none resize-none text-[#1A1A1A] dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3 mt-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{savingProfile ? "Saving..." : "Save Profile"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
