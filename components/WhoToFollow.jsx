"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  limit,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getGeohashNeighbors, calculateHaversineDistance } from "@/lib/geohash";
import { CheckCircle, UserPlus, UserCheck, Store } from "lucide-react";
import toast from "react-hot-toast";

export function WhoToFollow({ currentUserId, userCoords }) {
  const [businesses, setBusinesses] = useState([]);
  const [followedSet, setFollowedSet] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWhoToFollow() {
      setLoading(true);
      try {
        // 1. Fetch user's existing followed IDs from `users/{userId}/following` subcollection
        const followedIds = new Set();
        if (currentUserId) {
          try {
            const followSnap = await getDocs(
              collection(db, "users", currentUserId, "following")
            );
            followSnap.docs.forEach((d) => followedIds.add(d.id));
            setFollowedSet(followedIds);
          } catch (err) {
            console.warn("Could not fetch user following subcollection:", err.message);
          }
        }

        // 2. Fetch businesses from Firestore
        let fetchedList = [];
        try {
          const bizSnap = await getDocs(collection(db, "businesses"), limit(20));
          fetchedList = bizSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          // Ignore
        }

        // Filter out businesses user already follows
        const unFollowedList = fetchedList.filter((b) => !followedIds.has(b.id));

        // 3. Compute distance if user coordinates are available
        const scoredList = unFollowedList.map((biz) => {
          let distFormatted = null;
          let distanceKm = 999;

          if (userCoords && biz._geoloc?.lat && biz._geoloc?.lng) {
            distanceKm = calculateHaversineDistance(
              userCoords.lat,
              userCoords.lng,
              biz._geoloc.lat,
              biz._geoloc.lng
            );
            distFormatted = `${distanceKm} km`;
          }

          return {
            ...biz,
            distanceKm,
            distanceFormatted: distFormatted || biz.distanceFormatted || null,
          };
        });

        // Sort by distance if location available
        if (userCoords) {
          scoredList.sort((a, b) => a.distanceKm - b.distanceKm);
        }

        setBusinesses(scoredList.slice(0, 5));
      } catch (err) {
        console.error("Error loading WhoToFollow:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWhoToFollow();
  }, [currentUserId, userCoords]);

  const handleToggleFollow = async (businessId, bizName) => {
    const isFollowing = followedSet.has(businessId);
    const newFollowed = new Set(followedSet);

    if (isFollowing) {
      newFollowed.delete(businessId);
      setFollowedSet(newFollowed);
      toast.success(`Unfollowed ${bizName || "merchant"}`);

      if (currentUserId) {
        try {
          await deleteDoc(doc(db, "users", currentUserId, "following", businessId));
        } catch (err) {
          console.error("Failed to remove follow doc:", err);
        }
      }
    } else {
      newFollowed.add(businessId);
      setFollowedSet(newFollowed);
      toast.success(`Following ${bizName || "merchant"}!`);

      if (currentUserId) {
        try {
          await setDoc(doc(db, "users", currentUserId, "following", businessId), {
            followedAt: serverTimestamp(),
            businessId,
          });
        } catch (err) {
          console.error("Failed to add follow doc:", err);
        }
      }
    }

    // Refresh list to exclude newly followed business
    setBusinesses((prev) => prev.filter((b) => !newFollowed.has(b.id)));
  };

  if (!loading && businesses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-[#C8B99A]" />
          <h2
            className="font-extrabold text-sm text-[#1A1A1A] dark:text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Nearby Shops to Follow
          </h2>
        </div>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          Hyperlocal
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="space-y-1">
                  <div className="w-24 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="w-16 h-2.5 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="w-16 h-7 bg-gray-200 dark:bg-gray-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {businesses.map((biz) => {
            const isFollowing = followedSet.has(biz.id);
            return (
              <div key={biz.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/${biz.username || biz.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-white/10">
                    {biz.avatar || biz.logo ? (
                      <Image
                        src={biz.avatar || biz.logo}
                        alt={biz.name || "Business"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs">
                        {(biz.name || "B").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-xs text-[#1A1A1A] dark:text-white truncate group-hover:underline">
                        {biz.name || biz.businessName}
                      </p>
                      {biz.isVerified && (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                      <span>{biz.category || "Local Business"}</span>
                      {biz.distanceFormatted && (
                        <>
                          <span>•</span>
                          <span className="text-[#4A7C6F] font-semibold">
                            {biz.distanceFormatted}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => handleToggleFollow(biz.id, biz.name || biz.businessName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                    isFollowing
                      ? "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200"
                      : "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
