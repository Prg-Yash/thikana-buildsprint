"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Wrench,
  PlusSquare,
  Search,
  Clock,
  Edit2,
  Trash2,
  Calendar,
  Phone,
  X,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ServicesPage() {
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services"); // "services" | "appointments"
  const [searchQuery, setSearchQuery] = useState("");

  // Edit service modal state
  const [editingService, setEditingService] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("30");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingService, setUpdatingService] = useState(false);

  useEffect(() => {
    async function loadServicesData() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const servMap = new Map();

        // 1. Dual-path query for services (`services` collection & `users/{uid}/services` subcollection)
        try {
          const qTop1 = query(collection(db, "services"), where("userId", "==", user.uid));
          const snap1 = await getDocs(qTop1);
          snap1.docs.forEach((d) => servMap.set(d.id, { id: d.id, ...d.data() }));

          const qTop2 = query(collection(db, "services"), where("merchantId", "==", user.uid));
          const snap2 = await getDocs(qTop2);
          snap2.docs.forEach((d) => servMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (e) {
          console.warn("Could not fetch top-level services:", e.message);
        }

        try {
          const subSnap = await getDocs(collection(db, "users", user.uid, "services"));
          subSnap.docs.forEach((d) => servMap.set(d.id, { id: d.id, ...d.data() }));
        } catch {
          // Ignore
        }

        // Normalize service fields (`title` vs `name`, `durationMinutes` vs `duration`)
        const normalizedServs = Array.from(servMap.values()).map((s) => ({
          ...s,
          title: s.title || s.name || "General Service",
          durationMinutes: s.durationMinutes || s.duration || 30,
          price: parseFloat(s.price || "0"),
          isAvailable: s.isAvailable ?? true,
        }));

        setServices(normalizedServs);

        // 2. Fetch Customer Appointments
        try {
          const qApp = query(
            collection(db, "appointments"),
            where("merchantId", "==", user.uid)
          );
          const appSnap = await getDocs(qApp);
          if (!appSnap.empty) {
            setAppointments(appSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          }
        } catch (err) {
          console.warn("Could not fetch appointments:", err.message);
        }
      } catch (err) {
        console.error("Error loading services data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadServicesData();
  }, [user]);

  const handleToggleAvailability = async (serviceId, currentStatus) => {
    try {
      try {
        await updateDoc(doc(db, "services", serviceId), { isAvailable: !currentStatus });
      } catch {
        // Ignore
      }
      try {
        await updateDoc(doc(db, "users", user.uid, "services", serviceId), { isAvailable: !currentStatus });
      } catch {
        // Ignore
      }

      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, isAvailable: !currentStatus } : s))
      );
      toast.success(!currentStatus ? "Service activated" : "Service paused");
    } catch (err) {
      console.error("Error toggling service status:", err);
      toast.error("Failed to update status");
    }
  };

  const handleSaveServiceEdit = async (e) => {
    e.preventDefault();
    if (!editingService) return;

    setUpdatingService(true);
    const updatedFields = {
      title: editTitle.trim(),
      name: editTitle.trim(),
      price: parseFloat(editPrice || "0"),
      durationMinutes: parseInt(editDuration || "30", 10),
      duration: parseInt(editDuration || "30", 10),
      category: editCategory,
      description: editDescription.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      try {
        await updateDoc(doc(db, "services", editingService.id), updatedFields);
      } catch {
        // Ignore
      }
      try {
        await updateDoc(doc(db, "users", user.uid, "services", editingService.id), updatedFields);
      } catch {
        // Ignore
      }

      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? { ...s, ...updatedFields } : s))
      );
      setEditingService(null);
      toast.success("Service details updated!");
    } catch (err) {
      console.error("Error updating service:", err);
      toast.error("Failed to update service details");
    } finally {
      setUpdatingService(false);
    }
  };

  const handleDeleteService = async (serviceId, serviceTitle) => {
    if (confirm(`Are you sure you want to delete service "${serviceTitle}"?`)) {
      try {
        try {
          await deleteDoc(doc(db, "services", serviceId));
        } catch {
          // Ignore
        }
        try {
          await deleteDoc(doc(db, "users", user.uid, "services", serviceId));
        } catch {
          // Ignore
        }

        setServices((prev) => prev.filter((s) => s.id !== serviceId));
        toast.success("Service deleted.");
      } catch (err) {
        console.error("Error deleting service:", err);
        toast.error("Failed to delete service.");
      }
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const appRef = doc(db, "appointments", appointmentId);
      await updateDoc(appRef, { status: newStatus });

      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating appointment:", err);
      toast.error("Failed to update status");
    }
  };

  const filteredServices = services.filter((s) =>
    (s.title || s.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Services & Appointments
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage your service offerings, slot durations, and incoming customer appointments.
          </p>
        </div>

        <Link
          href="/add-service"
          className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <PlusSquare className="w-4 h-4" />
          <span>Add New Service</span>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E0D8] dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "services"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Service Offerings ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "appointments"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Customer Bookings ({appointments.length})</span>
        </button>
      </div>

      {/* TAB 1: Service Catalog */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search service title..."
              className="w-full bg-white dark:bg-[#1A1A1A] border border-[#DDD8CF] dark:border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs font-medium outline-none"
            />
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
              Loading service catalog...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
              <Wrench className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">No Services Listed</h3>
              <p className="text-xs text-gray-500">
                Add service offerings (e.g., haircuts, consultations, repairs) so clients can book appointments.
              </p>
              <Link
                href="/add-service"
                className="inline-block px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold"
              >
                Add First Service
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((serv) => (
                <div
                  key={serv.id}
                  className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={serv.imageUrl || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80"}
                        alt={serv.title || serv.name}
                        fill
                        className="object-cover"
                      />
                      <span
                        className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          serv.isAvailable ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"
                        }`}
                      >
                        {serv.isAvailable ? "Active" : "Paused"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        {serv.category || "General"}
                      </span>
                      <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mt-0.5">
                        {serv.title || serv.name}
                      </h3>
                      {serv.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                          {serv.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E5E0D8] dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-base text-[#1A1A1A] dark:text-white">
                        ₹{serv.price || 0}
                      </span>
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {serv.durationMinutes || 30} Mins
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleToggleAvailability(serv.id, serv.isAvailable)}
                        className="text-xs font-bold text-gray-600 dark:text-gray-300 hover:underline"
                      >
                        {serv.isAvailable ? "Pause Slot" : "Enable Slot"}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingService(serv);
                            setEditTitle(serv.title || serv.name || "");
                            setEditPrice(String(serv.price || ""));
                            setEditDuration(String(serv.durationMinutes || serv.duration || "30"));
                            setEditCategory(serv.category || "General Services");
                            setEditDescription(serv.description || "");
                          }}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition"
                          title="Edit Service"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(serv.id, serv.title || serv.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Appointments Manager */}
      {activeTab === "appointments" && (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-[#1A1A1A] dark:text-white">
            Incoming Client Appointments
          </h2>

          {appointments.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-400 space-y-2">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-bold text-[#1A1A1A] dark:text-white">No Appointment Bookings Yet</p>
              <p>Appointments booked by clients from your public storefront will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E0D8] dark:border-white/10 text-gray-400 uppercase text-[10px] font-bold">
                    <th className="pb-3 px-2">Client Name</th>
                    <th className="pb-3 px-2">Phone</th>
                    <th className="pb-3 px-2">Service</th>
                    <th className="pb-3 px-2">Date & Slot</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {appointments.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <td className="py-3.5 px-2 font-bold text-[#1A1A1A] dark:text-white">
                        {app.clientName || "Client"}
                      </td>
                      <td className="py-3.5 px-2 font-medium">
                        <a href={`tel:${app.clientPhone}`} className="hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {app.clientPhone || "+91 98765 43210"}
                        </a>
                      </td>
                      <td className="py-3.5 px-2 text-gray-700 dark:text-gray-300 font-bold">
                        {app.serviceTitle || "General Service"}
                      </td>
                      <td className="py-3.5 px-2 text-gray-500">
                        {app.bookingDate || "Today"} ({app.bookingTime || "10:00 AM"})
                      </td>
                      <td className="py-3.5 px-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            (app.status || "Pending").toLowerCase() === "pending"
                              ? "bg-amber-500/10 text-amber-600"
                              : (app.status || "").toLowerCase() === "confirmed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {app.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <select
                          value={app.status || "Pending"}
                          onChange={(e) => handleUpdateAppointmentStatus(app.id, e.target.value)}
                          className="bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-2 py-1 text-xs outline-none"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-md w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative">
            <button
              onClick={() => setEditingService(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-black text-base text-[#1A1A1A] dark:text-white">Edit Service Offering</h3>

            <form onSubmit={handleSaveServiceEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={updatingService}
                className="w-full py-3 mt-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{updatingService ? "Saving..." : "Save Service Details"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
