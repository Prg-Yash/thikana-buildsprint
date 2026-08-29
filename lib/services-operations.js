import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// Real-time services listener for canonical path users/{userId}/services
export function subscribeUserServices(userId, callback, onError) {
  if (!userId) return () => {};
  const colRef = collection(db, "users", userId, "services");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const services = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          title: data.title || data.name || "General Service",
          name: data.title || data.name || "General Service",
          priceType: data.priceType || (data.approxPrice ? "variable" : "fixed"),
          price: parseFloat(data.price || "0"),
          approxPrice: data.approxPrice || "",
          duration: parseInt(data.duration || data.durationMinutes || "30", 10),
          durationMinutes: parseInt(data.duration || data.durationMinutes || "30", 10),
          category: data.category || "General Services",
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          isAvailable: data.isAvailable ?? true,
        };
      });
      callback(services);
    },
    (err) => {
      console.error("Services real-time listener error:", err);
      if (onError) onError(err);
    }
  );
}

// Real-time appointments listener for canonical path users/{userId}/appointments
export function subscribeUserAppointments(userId, callback, onError) {
  if (!userId) return () => {};
  const colRef = collection(db, "users", userId, "appointments");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const appointments = snapshot.docs.map((d) => {
        const a = d.data();
        return {
          id: d.id,
          ...a,
          clientName: a.clientName || a.customerName || "Client",
          clientPhone: a.clientPhone || a.customerPhone || a.phoneNumber || "+91 98765 43210",
          serviceTitle: a.serviceTitle || a.serviceName || "General Service",
          bookingDate: a.bookingDate || a.date || "Today",
          bookingTime: a.bookingTime || a.timeSlot || a.time || "10:00 AM",
          status: a.status || "Pending",
        };
      });
      callback(appointments);
    },
    (err) => {
      console.error("Appointments real-time listener error:", err);
      if (onError) onError(err);
    }
  );
}

// Save Service
export async function saveServiceItem(userId, serviceData) {
  if (!userId) throw new Error("User ID is required");

  const servId = serviceData.id || doc(collection(db, "users", userId, "services")).id;
  const docData = {
    ...serviceData,
    id: servId,
    userId,
    title: (serviceData.title || serviceData.name || "").trim(),
    name: (serviceData.title || serviceData.name || "").trim(),
    priceType: serviceData.priceType || "fixed",
    price: parseFloat(serviceData.price || "0"),
    approxPrice: serviceData.approxPrice ? serviceData.approxPrice.trim() : null,
    duration: parseInt(serviceData.duration || serviceData.durationMinutes || "30", 10),
    durationMinutes: parseInt(serviceData.duration || serviceData.durationMinutes || "30", 10),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", userId, "services", servId), docData, { merge: true });
  return { id: servId, ...docData };
}

// Delete Service
export async function deleteServiceItem(userId, serviceId) {
  if (!userId || !serviceId) return;
  await deleteDoc(doc(db, "users", userId, "services", serviceId));
}
