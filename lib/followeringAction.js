import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { sendNotificationToUser } from "@/lib/notifications";

/**
 * Fetch resolved profile metadata for a user or business ID
 */
async function resolveProfileMetadata(uid) {
  if (!uid) return null;

  try {
    let name = "User";
    let businessName = "";
    let username = uid;
    let profilePic = "";
    let isBusiness = false;
    let businessType = "Retail";

    // 1. Query users/{uid}
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      const uData = userSnap.data();
      name = uData.displayName || uData.name || "User";
      businessName = uData.businessName || "";
      username = uData.username || uData.displayName?.toLowerCase().replace(/\s+/g, "-") || uid;
      profilePic = uData.profilePic || uData.photoURL || uData.avatar || "";
      isBusiness = uData.accountType === "business" || uData.isBusiness === true || Boolean(uData.businessName);
      businessType = uData.business_type || uData.businessType || "Retail";
    }

    // 2. Query businesses/{uid} for business details if available
    const bizSnap = await getDoc(doc(db, "businesses", uid));
    if (bizSnap.exists()) {
      const bData = bizSnap.data();
      businessName = bData.businessName || businessName || name;
      username = bData.username || username;
      profilePic = bData.logoUrl || bData.profilePic || bData.avatar || profilePic;
      isBusiness = true;
      businessType = bData.business_type || bData.category || businessType;
    }

    return {
      uid,
      name: businessName || name,
      displayName: name,
      businessName,
      username,
      profilePic,
      isBusiness,
      businessType,
    };
  } catch (err) {
    console.warn(`Error resolving profile metadata for ${uid}:`, err);
    return {
      uid,
      name: "Local User",
      businessName: "",
      username: uid,
      profilePic: "",
      isBusiness: false,
      businessType: "User",
    };
  }
}

/**
 * Get all followers for a user/business
 */
export async function getFollowers(userId) {
  if (!userId) return [];

  try {
    const followersRef = collection(db, "users", userId, "followers");
    const snap = await getDocs(followersRef);

    const followerPromises = snap.docs.map(async (docSnap) => {
      const followerUid = docSnap.id;
      const meta = await resolveProfileMetadata(followerUid);
      return {
        ...meta,
        followedAt: docSnap.data().followedAt || null,
      };
    });

    return await Promise.all(followerPromises);
  } catch (err) {
    console.error(`Error getting followers for ${userId}:`, err);
    return [];
  }
}

/**
 * Get all businesses/users being followed by a user
 */
export async function getFollowing(userId) {
  if (!userId) return [];

  try {
    const followingRef = collection(db, "users", userId, "following");
    const snap = await getDocs(followingRef);

    const followingPromises = snap.docs.map(async (docSnap) => {
      const targetUid = docSnap.id;
      const meta = await resolveProfileMetadata(targetUid);
      return {
        ...meta,
        followedAt: docSnap.data().followedAt || null,
      };
    });

    return await Promise.all(followingPromises);
  } catch (err) {
    console.error(`Error getting following for ${userId}:`, err);
    return [];
  }
}

/**
 * Follow a business user (Symmetrical write)
 */
export async function followUser(currentUserId, targetBusinessId, currentUserData = {}) {
  if (!currentUserId || !targetBusinessId || currentUserId === targetBusinessId) {
    return { success: false, error: "Invalid follow operation parameters" };
  }

  try {
    const now = new Date().toISOString();

    // 1. Add to target store's followers subcollection: users/{targetBusinessId}/followers/{currentUserId}
    const followerRef = doc(db, "users", targetBusinessId, "followers", currentUserId);
    await setDoc(followerRef, {
      followerUid: currentUserId,
      followedAt: now,
      createdAt: serverTimestamp(),
    });

    // 2. Add to current user's following subcollection: users/{currentUserId}/following/{targetBusinessId}
    const followingRef = doc(db, "users", currentUserId, "following", targetBusinessId);
    await setDoc(followingRef, {
      businessId: targetBusinessId,
      followedAt: now,
      createdAt: serverTimestamp(),
    });

    // 3. Dispatch real-time in-app notification to the store owner
    const followerName = currentUserData.displayName || currentUserData.name || "A local shopper";
    sendNotificationToUser(targetBusinessId, {
      title: "New Store Follower 🎉",
      message: `${followerName} started following your store.`,
      type: "follower",
      link: `/store/${currentUserData.username || currentUserId}`,
    }).catch((e) => console.warn("Follow notification dispatch error:", e));

    return { success: true };
  } catch (err) {
    console.error("Error executing follow user:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Unfollow a business user (Symmetrical delete)
 */
export async function unfollowUser(currentUserId, targetBusinessId) {
  if (!currentUserId || !targetBusinessId) {
    return { success: false, error: "Invalid parameters" };
  }

  try {
    // 1. Delete from target store's followers subcollection
    const followerRef = doc(db, "users", targetBusinessId, "followers", currentUserId);
    await deleteDoc(followerRef);

    // 2. Delete from current user's following subcollection
    const followingRef = doc(db, "users", currentUserId, "following", targetBusinessId);
    await deleteDoc(followingRef);

    return { success: true };
  } catch (err) {
    console.error("Error executing unfollow user:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a follower (executed by business owner)
 */
export async function removeFollower(businessId, followerUid) {
  if (!businessId || !followerUid) {
    return { success: false, error: "Invalid parameters" };
  }

  try {
    // 1. Delete from business's followers subcollection
    const followerRef = doc(db, "users", businessId, "followers", followerUid);
    await deleteDoc(followerRef);

    // 2. Delete from follower's following subcollection
    const followingRef = doc(db, "users", followerUid, "following", businessId);
    await deleteDoc(followingRef);

    return { success: true };
  } catch (err) {
    console.error("Error removing follower:", err);
    return { success: false, error: err.message };
  }
}
