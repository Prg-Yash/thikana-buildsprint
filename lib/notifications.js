import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Format phone numbers to E.164 international standard
 */
export function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned; // Default country code India
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = "+" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

/**
 * Dispatch multi-channel integrations (WhatsApp and Email)
 */
async function triggerExternalChannels(userData, notification) {
  const { whatsapp, email, title, message } = notification;

  // 1. WhatsApp Dispatch Pipeline
  if (whatsapp) {
    const rawPhone = userData?.phone || userData?.phoneNumber;
    if (rawPhone) {
      const formattedPhone = formatPhoneNumber(rawPhone);
      fetch("/api/notification-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          title: title || "Notification Alert",
          message: message || "",
          sender: notification.sender || "Thikana Platform",
          timestamp: new Date().toISOString(),
        }),
      }).catch((e) => console.warn("WhatsApp dispatch error:", e));
    }
  }

  // 2. Email Dispatch Pipeline
  if (email) {
    const userEmail = userData?.email;
    if (userEmail) {
      fetch("/api/notification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          recipientName: userData.displayName || userData.name || "Valued User",
          title: title || "Notification Alert",
          message: message || "",
          sender: notification.sender || "Thikana Platform",
          link: notification.link || "",
          timestamp: new Date().toISOString(),
        }),
      }).catch((e) => console.warn("Notification Email dispatch error:", e));
    }
  }
}

/**
 * Send notification to 1 specific user
 */
export async function sendNotificationToUser(targetUserId, notification) {
  if (!targetUserId) throw new Error("Target user ID is required");

  const timestampId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const notifRef = doc(db, "users", targetUserId, "notifications", timestampId);

  const notifPayload = {
    id: timestampId,
    title: notification.title || "New Notification",
    message: notification.message || "",
    type: notification.type || "system", // 'order_update' | 'message' | 'promotion' | 'follower' | 'system' | 'test'
    sender: notification.sender || "System Alert",
    read: false,
    link: notification.link || "",
    whatsapp: Boolean(notification.whatsapp),
    email: Boolean(notification.email),
    timestamp: new Date().toISOString(),
    createdAt: serverTimestamp(),
  };

  await setDoc(notifRef, notifPayload);

  // Fetch target user metadata for WhatsApp / Email dispatch
  try {
    const userSnap = await getDoc(doc(db, "users", targetUserId));
    if (userSnap.exists()) {
      await triggerExternalChannels(userSnap.data(), notifPayload);
    }
  } catch (err) {
    console.warn("Could not fetch user metadata for external notification channels:", err.message);
  }

  return { success: true, notificationId: timestampId };
}

/**
 * Universal Multi-Audience Notification Dispatch Engine
 * Supports:
 * - to: "everyone" -> Broadcast to all users in 'users' collection
 * - to: "business" | "user" | "member" | "franchise_admin" -> Cohort role broadcast
 * - to: "<userId>" -> Single user dispatch
 */
export async function addNotification(payload) {
  const { to, userId, targetUserId, ...notificationDetails } = payload;
  const audience = to || userId || targetUserId;

  if (!audience) {
    throw new Error("Recipient target ('to' or 'userId') is required");
  }

  // 1. Broadcast to Everyone
  if (audience === "everyone") {
    const usersSnap = await getDocs(collection(db, "users"));
    const dispatchPromises = usersSnap.docs.map((uDoc) =>
      sendNotificationToUser(uDoc.id, notificationDetails)
    );
    await Promise.allSettled(dispatchPromises);
    return { success: true, count: usersSnap.size, target: "everyone" };
  }

  // 2. Role-based Cohort Broadcast
  const validRoles = ["business", "user", "member", "franchise_admin", "admin"];
  if (validRoles.includes(audience)) {
    // Query users where role or accountType matches target role
    const usersRef = collection(db, "users");
    const roleQuery = query(usersRef, where("accountType", "==", audience));
    let roleSnap = await getDocs(roleQuery);

    if (roleSnap.empty) {
      // Fallback query for 'role' field
      const fallbackQuery = query(usersRef, where("role", "==", audience));
      roleSnap = await getDocs(fallbackQuery);
    }

    const dispatchPromises = roleSnap.docs.map((uDoc) =>
      sendNotificationToUser(uDoc.id, notificationDetails)
    );
    await Promise.allSettled(dispatchPromises);
    return { success: true, count: roleSnap.size, target: audience };
  }

  // 3. Specific User Target
  return await sendNotificationToUser(audience, notificationDetails);
}

/**
 * Mark a single notification document as read
 */
export async function markNotificationAsRead(userId, notificationId) {
  if (!userId || !notificationId) return;
  const notifRef = doc(db, "users", userId, "notifications", notificationId);
  await updateDoc(notifRef, {
    read: true,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Mark all unread notifications as read using Firestore writeBatch
 */
export async function markAllNotificationsAsRead(userId, unreadNotificationIds = []) {
  if (!userId) return;

  const batch = writeBatch(db);

  if (unreadNotificationIds.length > 0) {
    unreadNotificationIds.forEach((nId) => {
      const ref = doc(db, "users", userId, "notifications", nId);
      batch.update(ref, { read: true, updatedAt: new Date().toISOString() });
    });
    await batch.commit();
  } else {
    // Query unread notifications
    const notifsRef = collection(db, "users", userId, "notifications");
    const q = query(notifsRef, where("read", "==", false));
    const snap = await getDocs(q);

    if (!snap.empty) {
      snap.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { read: true, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    }
  }
}

/**
 * Delete a notification document
 */
export async function deleteNotification(userId, notificationId) {
  if (!userId || !notificationId) return;
  const notifRef = doc(db, "users", userId, "notifications", notificationId);
  await deleteDoc(notifRef);
}
