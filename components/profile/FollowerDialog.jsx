"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getFollowers, removeFollower } from "@/lib/followeringAction";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  X,
  Loader2,
  Store,
  Building2,
  User,
  UserMinus,
  CheckCircle2,
} from "lucide-react";

export function FollowerDialog({
  open,
  onClose,
  targetUserId,
  storeName = "Store",
  viewOnly = false,
}) {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingUid, setRemovingUid] = useState(null);

  useEffect(() => {
    if (!open || !targetUserId) return;

    async function loadData() {
      setLoading(true);
      try {
        const list = await getFollowers(targetUserId);
        setFollowers(list);
      } catch (err) {
        console.error("Error loading followers:", err);
        toast.error("Failed to load followers list.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [open, targetUserId]);

  if (!open) return null;

  // Filter followers by search query
  const filteredFollowers = followers.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q) ||
      f.businessName?.toLowerCase().includes(q)
    );
  });

  // Handle Remove Follower (Owner Management Mode)
  const handleRemoveFollower = async (followerUid, followerName) => {
    if (!targetUserId || !followerUid) return;

    setRemovingUid(followerUid);
    const toastId = toast.loading(`Removing ${followerName || "follower"}...`);

    try {
      const res = await removeFollower(targetUserId, followerUid);
      if (res.success) {
        setFollowers((prev) => prev.filter((item) => item.uid !== followerUid));
        toast.success(`Removed ${followerName || "follower"} from store followers.`, { id: toastId });
      } else {
        throw new Error(res.error || "Failed to remove follower");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setRemovingUid(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A1A] dark:text-white">
                Store Followers ({followers.length})
              </h3>
              <p className="text-[11px] text-gray-500">
                Shoppers and merchants following {storeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search followers by name or handle..."
            className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
          />
        </div>

        {/* Followers List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
              <p className="text-xs text-gray-400 font-bold">Loading followers...</p>
            </div>
          ) : filteredFollowers.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              {searchQuery.trim() ? "No matching followers found." : "No store followers yet."}
            </div>
          ) : (
            filteredFollowers.map((item) => (
              <div
                key={item.uid}
                className="p-3 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 flex items-center justify-between gap-3 hover:border-gray-300 dark:hover:border-white/20 transition"
              >
                {/* Avatar & Info */}
                <Link
                  href={`/store/${item.username || item.uid}`}
                  onClick={onClose}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-gray-200 dark:border-white/10">
                    {item.profilePic ? (
                      <Image
                        src={item.profilePic}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span>{(item.name || "U").charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-extrabold text-xs text-[#1A1A1A] dark:text-white truncate group-hover:underline">
                        {item.name}
                      </p>
                      {item.isBusiness ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
                          <Store className="w-2.5 h-2.5" /> Biz
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
                          <User className="w-2.5 h-2.5" /> User
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">@{item.username}</p>
                  </div>
                </Link>

                {/* Remove Follower Action (Owner Mode Only) */}
                {!viewOnly && (
                  <button
                    onClick={() => handleRemoveFollower(item.uid, item.name)}
                    disabled={removingUid === item.uid}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                    title="Remove follower"
                  >
                    {removingUid === item.uid ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default FollowerDialog;
