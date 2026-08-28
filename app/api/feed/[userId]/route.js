import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  doc,
  getDoc,
} from "firebase/firestore";
import { getGeohashNeighbors, calculateHaversineDistance } from "@/lib/geohash";

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limitNum = parseInt(searchParams.get("limit") || "10", 10);
    const pageNum = parseInt(searchParams.get("page") || "1", 10);
    const lat = parseFloat(searchParams.get("lat") || "NaN");
    const lng = parseFloat(searchParams.get("lng") || "NaN");

    // 1. Fetch user's followed business IDs
    const followedSet = new Set();
    if (userId && userId !== "guest") {
      try {
        const followingSnap = await getDocs(collection(db, "users", userId, "following"));
        followingSnap.docs.forEach((docSnap) => {
          followedSet.add(docSnap.id);
        });
      } catch (e) {
        console.warn("Could not fetch user following list:", e.message);
      }
    }

    // 2. Fetch business map for enrichment (businessName, businessAvatar, username, _geoloc)
    const businessMap = new Map();
    try {
      const bizSnap = await getDocs(collection(db, "businesses"));
      bizSnap.docs.forEach((d) => {
        businessMap.set(d.id, { id: d.id, ...d.data() });
      });
    } catch (e) {
      console.warn("Could not fetch business collection for feed enrichment:", e.message);
    }

    // 3. Compute geohash neighbors if coordinates are provided
    let neighborCells = new Set();
    const hasLocation = !isNaN(lat) && !isNaN(lng);
    if (hasLocation) {
      try {
        const spatial = getGeohashNeighbors(lat, lng, 5);
        neighborCells = new Set(spatial.allCells);
      } catch (e) {
        console.warn("Geohash cell calculation error:", e.message);
      }
    }

    // 4. Query candidate posts from Firestore
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      firestoreLimit(100)
    );
    const snapshot = await getDocs(postsQuery);

    const businessPostCount = new Map();
    const scoredPosts = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const businessId = data.businessId || data.uid || data.userId || "unknown";

      // Limit max 2 posts per business for diversity
      const currentCount = businessPostCount.get(businessId) || 0;
      if (currentCount >= 2) continue;

      // Enrich post with business info if available from 'businesses' collection
      const bizInfo = businessMap.get(businessId) || {};
      const businessName =
        data.businessName || bizInfo.businessName || bizInfo.name || "Local Merchant";
      const businessAvatar =
        data.businessAvatar || bizInfo.profilePic || bizInfo.avatar || bizInfo.logo || "";
      const username =
        data.username || bizInfo.username || businessId;
      const postGeoloc = data._geoloc || bizInfo._geoloc || bizInfo.location || null;

      let score = 0;
      let calculatedDistance = null;

      // Follow score boost
      const isFollowed = followedSet.has(businessId);
      if (isFollowed) {
        score += 50;
      }

      // Location score boost using geohash & Haversine distance
      if (hasLocation && postGeoloc?.lat && postGeoloc?.lng) {
        const distance = calculateHaversineDistance(lat, lng, postGeoloc.lat, postGeoloc.lng);
        calculatedDistance = `${distance} km`;

        if (distance <= 2) {
          score += 40;
        } else if (distance <= 5) {
          score += 25;
        } else if (distance <= 10) {
          score += 10;
        }

        if (data.geohash && neighborCells.has(data.geohash)) {
          score += 15;
        }
      }

      // Recency score (decay over time)
      const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
      const hoursAgo = Math.max(0, (Date.now() - createdAtMs) / (1000 * 60 * 60));
      const recencyScore = Math.max(0, 30 - hoursAgo * 0.5);
      score += recencyScore;

      businessPostCount.set(businessId, currentCount + 1);

      // Normalize images array
      const images =
        data.images && data.images.length > 0
          ? data.images
          : data.mediaUrl
          ? [data.mediaUrl]
          : data.imageUrl
          ? [data.imageUrl]
          : [];

      // Normalize caption
      const caption = data.caption || data.content || data.description || "";

      scoredPosts.push({
        id: docSnap.id,
        ...data,
        businessId,
        businessName,
        businessAvatar,
        username,
        caption,
        images,
        category: data.category || data.businessType || "General",
        distanceFormatted: calculatedDistance || data.distanceFormatted || null,
        likesCount: data.likesCount || data.likes || data.interactions?.likeCount || 0,
        isVerified: true,
        isFollowed,
        recommendationScore: Math.round(score),
      });
    }

    // 5. Rank posts by calculated score descending
    scoredPosts.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // 6. Apply pagination slicing
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedPosts = scoredPosts.slice(startIndex, startIndex + limitNum);
    const hasMore = startIndex + limitNum < scoredPosts.length;

    return NextResponse.json({
      success: true,
      userId,
      page: pageNum,
      posts: paginatedPosts,
      totalCandidates: scoredPosts.length,
      hasMore,
    });
  } catch (error) {
    console.error("Feed recommendation API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch recommendation feed" },
      { status: 500 }
    );
  }
}
