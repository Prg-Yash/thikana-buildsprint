import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";

const LOCK_STALE_MS = 30000; // 30 seconds stale timeout

/**
 * Acquire lock for a specific persona within a business
 */
export async function acquirePersonaLock(businessId, personaId, user) {
  if (!businessId || !personaId || !user?.uid) return { success: false, error: "Invalid parameters" };

  const lockRef = doc(db, "users", businessId, "persona_locks", personaId);

  try {
    const snap = await getDoc(lockRef);
    const now = Date.now();

    if (snap.exists()) {
      const data = snap.data();
      const lastActive = data.lastActive || 0;
      const isStale = now - lastActive > LOCK_STALE_MS;
      const isSelf = data.occupiedBy?.uid === user.uid;

      if (!isStale && !isSelf) {
        // Locked by another user
        return {
          success: false,
          occupiedBy: data.occupiedBy,
          lockedSince: data.occupiedAt,
        };
      }
    }

    // Acquire or renew lock
    const lockPayload = {
      personaId,
      occupiedBy: {
        uid: user.uid,
        name: user.displayName || user.name || user.email || "Team Member",
        email: user.email || "",
      },
      occupiedAt: snap.exists() && snap.data()?.occupiedBy?.uid === user.uid ? snap.data().occupiedAt : new Date().toISOString(),
      lastActive: now,
    };

    await setDoc(lockRef, lockPayload);
    return { success: true };
  } catch (err) {
    console.error("Error acquiring persona lock:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Refresh lock heartbeat (keep-alive)
 */
export async function refreshPersonaLock(businessId, personaId, userId) {
  if (!businessId || !personaId || !userId) return;
  try {
    const lockRef = doc(db, "users", businessId, "persona_locks", personaId);
    await setDoc(
      lockRef,
      {
        lastActive: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    // Ignore heartbeat error
  }
}

/**
 * Release persona lock when user exits or switches tabs
 */
export async function releasePersonaLock(businessId, personaId, userId) {
  if (!businessId || !personaId || !userId) return;
  try {
    const lockRef = doc(db, "users", businessId, "persona_locks", personaId);
    const snap = await getDoc(lockRef);
    if (snap.exists() && snap.data()?.occupiedBy?.uid === userId) {
      await deleteDoc(lockRef);
    }
  } catch (e) {
    console.warn("Error releasing persona lock:", e);
  }
}

/**
 * Real-time listener for all active persona locks for a business
 */
export function subscribePersonaLocks(businessId, callback) {
  if (!businessId) return () => {};

  const locksRef = collection(db, "users", businessId, "persona_locks");
  return onSnapshot(
    locksRef,
    (snap) => {
      const locksMap = {};
      const now = Date.now();

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        // Ignore stale locks (> 30s inactive)
        if (now - (data.lastActive || 0) <= LOCK_STALE_MS) {
          locksMap[docSnap.id] = data.occupiedBy;
        }
      });

      callback(locksMap);
    },
    (err) => {
      console.warn("Persona locks subscription error:", err);
    }
  );
}
