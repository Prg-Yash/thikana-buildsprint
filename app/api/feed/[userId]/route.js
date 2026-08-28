import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { getGeohashNeighbors, calculateHaversineDistance } from "@/lib/geohash";

// Helper to extract lat/lng safely from various Firestore shapes
function extractCoords(obj) {
  if (!obj) return null;
  const lat = typeof obj.lat === "number" ? obj.lat : typeof obj.latitude === "number" ? obj.latitude : null;
  const lng = typeof obj.lng === "number" ? obj.lng : typeof obj.longitude === "number" ? obj.longitude : null;
  if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }
  return null;
}

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limitNum = parseInt(searchParams.get("limit") || "10", 10);
    const pageNum = parseInt(searchParams.get("page") || "1", 10);
    const userLat = parseFloat(searchParams.get("lat") || "NaN");
    const userLng = parseFloat(searchParams.get("lng") || "NaN");

    // Location is mandatory for location-dependent feed
    if (isNaN(userLat) || isNaN(userLng)) {
      return NextResponse.json(
        { success: false, error: "User location coordinates (lat, lng) are required for feed query." },
        { status: 400 }
      );
    }

    // 1. Fetch user's followed business IDs from `users/{userId}/following` subcollection
    const followedSet = new Set();
    if (userId && userId !== "guest") {
      try {
        const followingSnap = await getDocs(collection(db, "users", userId, "following"));
        followingSnap.docs.forEach((docSnap) => followedSet.add(docSnap.id));
      } catch (e) {
        console.warn("Could not fetch user following list:", e.message);
      }
    }

    // 2. Query location_index using 3x3 geohash neighbor cells
    const spatial = getGeohashNeighbors(userLat, userLng, 5);
    const spatialCells = spatial.allCells;

    const nearbyBusinessMap = new Map(); // businessId -> { distanceKm, isFollowed }

    // Fetch location_index entries matching surrounding geohash cells
    for (const cell of spatialCells) {
      try {
        const locQuery = query(
          collection(db, "location_index"),
          where("geohash5", "==", cell)
        );
        const locSnap = await getDocs(locQuery);
        for (const lDoc of locSnap.docs) {
          const lData = lDoc.data();
          const bizId = lData.businessId || lDoc.id.split("_")[1] || lDoc.id;
          const bizCoords = extractCoords(lData) || extractCoords(lData.location);

          if (bizCoords) {
            const dist = calculateHaversineDistance(userLat, userLng, bizCoords.lat, bizCoords.lng);
            // Strict 10 km spatial cutoff enforcement
            if (dist <= 10) {
              nearbyBusinessMap.set(bizId, {
                businessId: bizId,
                distanceKm: dist,
                isFollowed: followedSet.has(bizId),
                address: lData.address || null,
              });
            }
          }
        }
      } catch (e) {
        console.warn(`Error querying location_index for cell ${cell}:`, e.message);
      }
    }

    // Also check followed businesses and add them if within 10km (or calculate their distance)
    if (followedSet.size > 0) {
      for (const bizId of followedSet) {
        if (!nearbyBusinessMap.has(bizId)) {
          try {
            const bizSnap = await getDocs(
              query(collection(db, "businesses"), where("adminId", "==", bizId))
            );
            if (!bizSnap.empty) {
              const bData = bizSnap.docs[0].data();
              const bCoords = extractCoords(bData._geoloc) || extractCoords(bData.location);
              if (bCoords) {
                const dist = calculateHaversineDistance(userLat, userLng, bCoords.lat, bCoords.lng);
                if (dist <= 10) {
                  nearbyBusinessMap.set(bizId, {
                    businessId: bizId,
                    distanceKm: dist,
                    isFollowed: true,
                    address: bData.locationAddress || bData.address?.formatted || null,
                  });
                }
              }
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    // 3. Query posts collection
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      firestoreLimit(100)
    );
    const snapshot = await getDocs(postsQuery);

    // Also load business details for enrichment
    const businessDetailsMap = new Map();
    try {
      const bizAllSnap = await getDocs(collection(db, "businesses"));
      bizAllSnap.docs.forEach((d) => businessDetailsMap.set(d.id, d.data()));
    } catch {
      // Ignore
    }

    const businessPostCount = new Map();
    const scoredPosts = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const businessId = data.businessId || data.uid || data.userId || "unknown";

      // Candidate must belong to a business within 10km radius
      const nearbyMeta = nearbyBusinessMap.get(businessId);
      const postCoords = extractCoords(data._geoloc) || extractCoords(data.location);

      let distanceKm = nearbyMeta?.distanceKm ?? null;
      if (distanceKm === null && postCoords) {
        distanceKm = calculateHaversineDistance(userLat, userLng, postCoords.lat, postCoords.lng);
      }

      // Enforce strict 10km cutoff
      if (distanceKm === null || distanceKm > 10) {
        continue;
      }

      // Enforce max 2 posts per business diversity rule
      const currentCount = businessPostCount.get(businessId) || 0;
      if (currentCount >= 2) continue;

      // 4. Calculate Exact Weighted Score: Score = (Follow * 0.4) + (Location * 0.4) + (Recency * 0.2)
      const isFollowed = followedSet.has(businessId);
      const followScore = isFollowed ? 100 : 0;

      // Location Score (100 at 0km, linear decay down to 0 at 10km)
      const locationScore = Math.max(0, 100 * (1 - distanceKm / 10));

      // Recency Score (100 at 0h, linear decay down to 0 at 72h)
      const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
      const hoursAgo = Math.max(0, (Date.now() - createdAtMs) / (1000 * 60 * 60));
      const recencyScore = Math.max(0, 100 * (1 - hoursAgo / 72));

      const totalScore = Math.round(
        followScore * 0.4 + locationScore * 0.4 + recencyScore * 0.2
      );

      businessPostCount.set(businessId, currentCount + 1);

      // Business details enrichment
      const bizInfo = businessDetailsMap.get(businessId) || {};
      const businessName =
        data.businessName || bizInfo.businessName || bizInfo.name || "Local Merchant";
      const businessAvatar =
        data.businessAvatar || bizInfo.profilePic || bizInfo.avatar || bizInfo.logo || "";
      const username = data.username || bizInfo.username || businessId;

      // Model Normalization
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

      scoredPosts.push({
        id: docSnap.id,
        businessId,
        businessName,
        businessAvatar,
        username,
        caption,
        images,
        category: data.category || data.businessType || "General",
        distanceKm: Math.round(distanceKm * 10) / 10,
        distanceFormatted: `${Math.round(distanceKm * 10) / 10} km`,
        likeCount,
        commentCount,
        isVerified: true,
        isFollowed,
        score: totalScore,
        createdAt: data.createdAt || null,
      });
    }

    // 5. Sort candidate posts by total score descending
    scoredPosts.sort((a, b) => b.score - a.score);

    // 6. Pagination slicing
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
