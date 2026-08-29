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
  setDoc,
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
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_WEEKLY_SCHEDULE = [
  { day: "Mon", enabled: true, startTime: "09:00", endTime: "18:00" },
  { day: "Tue", enabled: true, startTime: "09:00", endTime: "18:00" },
  { day: "Wed", enabled: true, startTime: "09:00", endTime: "18:00" },
  { day: "Thu", enabled: true, startTime: "09:00", endTime: "18:00" },
  { day: "Fri", enabled: true, startTime: "09:00", endTime: "18:00" },
  { day: "Sat", enabled: true, startTime: "10:00", endTime: "16:00" },
  { day: "Sun", enabled: false, startTime: "10:00", endTime: "16:00" },
];

export default function ProfileServicesPage() {
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("services"); // "services" | "appointments"
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Service Modal State
  const [modalOpen, setBookModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [title, setTitle] = useState("");
  const [priceType, setPriceType] = useState("fixed"); // "fixed" | "variable"
  const [price, setPrice] = useState("");
  const [approxPrice, setApproxPrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [category, setCategory] = useState("Salon & Beauty");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState(DEFAULT_WEEKLY_SCHEDULE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadServicesData() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // CANONICAL PATH: users/{userId}/services
        const subSnap = await getDocs(collection(db, "users", user.uid, "services"));
        const fetched = subSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || data.name || "General Service",
            priceType: data.priceType || (data.approxPrice ? "variable" : "fixed"),
            price: parseFloat(data.price || "0"),
            approxPrice: data.approxPrice || "",
            duration: parseInt(data.duration || data.durationMinutes || "30", 10),
            category: data.category || "General Services",
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            isAvailable: data.isAvailable ?? true,
            weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : DEFAULT_WEEKLY_SCHEDULE,
          };
        });

        setServices(fetched);

        // CANONICAL APPOINTMENT DUAL QUERY
        const appMap = new Map();
        try {
          const appSubSnap = await getDocs(collection(db, "users", user.uid, "appointments"));
          appSubSnap.docs.forEach((d) => appMap.set(d.id, { id: d.id, ...d.data() }));

          const appTopSnap = await getDocs(
            query(collection(db, "appointments"), where("merchantId", "==", user.uid))
          );
          appTopSnap.docs.forEach((d) => appMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (e) {
          console.warn("Could not fetch appointments:", e.message);
        }

        const normalizedAppointments = Array.from(appMap.values()).map((a) => ({
          id: a.id,
          clientName: a.clientName || a.customerName || "Client",
          clientPhone: a.clientPhone || a.customerPhone || a.phoneNumber || "+91 98765 43210",
          serviceTitle: a.serviceTitle || a.serviceName || "General Service",
          bookingDate: a.bookingDate || a.date || "Today",
          bookingTime: a.bookingTime || a.timeSlot || a.time || "10:00 AM",
          status: a.status || "Pending",
          createdAt: a.createdAt || null,
        }));

        setAppointments(normalizedAppointments);
      } catch (err) {
        console.error("Error loading services:", err);
        setError("Failed to load services catalog from database.");
      } finally {
        setLoading(false);
      }
    }

    loadServicesData();
  }, [user]);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setTitle("");
    setPriceType("fixed");
    setPrice("");
    setApproxPrice("");
    setDuration("30");
    setCategory("Salon & Beauty");
    setDescription("");
    setImageUrl("");
    setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
    setBookModalOpen(true);
  };

  const handleOpenEditModal = (serv) => {
    setEditingService(serv);
    setTitle(serv.title || "");
    setPriceType(serv.priceType || (serv.approxPrice ? "variable" : "fixed"));
    setPrice(String(serv.price || ""));
    setApproxPrice(serv.approxPrice || "");
    setDuration(String(serv.duration || "30"));
    setCategory(serv.category || "Salon & Beauty");
    setDescription(serv.description || "");
    setImageUrl(serv.imageUrl || "");
    setWeeklySchedule(Array.isArray(serv.weeklySchedule) ? serv.weeklySchedule : DEFAULT_WEEKLY_SCHEDULE);
    setBookModalOpen(true);
  };

  const handleToggleDay = (idx) => {
    setWeeklySchedule((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleTimeChange = (idx, field, value) => {
    setWeeklySchedule((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user?.uid) return;

    setIsSubmitting(true);
    const serviceDoc = {
      title: title.trim(),
      name: title.trim(),
      priceType,
      price: parseFloat(price || "0"),
      approxPrice: priceType === "variable" ? approxPrice.trim() : null,
      duration: parseInt(duration || "30", 10),
      durationMinutes: parseInt(duration || "30", 10),
      category,
      description: description.trim(),
      imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
      weeklySchedule,
      isAvailable: editingService ? editingService.isAvailable ?? true : true,
      updatedAt: serverTimestamp(),
      ...(editingService && editingService.createdAt ? { createdAt: editingService.createdAt } : { createdAt: serverTimestamp() }),
    };

    try {
      const servDocId = editingService ? editingService.id : doc(collection(db, "users", user.uid, "services")).id;
      await setDoc(doc(db, "users", user.uid, "services", servDocId), serviceDoc, { merge: true });

      setServices((prev) => {
        const updated = { id: servDocId, ...serviceDoc };
        if (editingService) {
          return prev.map((s) => (s.id === servDocId ? updated : s));
        }
        return [updated, ...prev];
      });

      setBookModalOpen(false);
      toast.success(editingService ? "Service updated!" : "Service added!");
    } catch (err) {
      console.error("Error saving service:", err);
      toast.error("Failed to save service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (serviceId, currentStatus) => {
    try {
      await updateDoc(doc(db, "users", user.uid, "services", serviceId), { isAvailable: !currentStatus });
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, isAvailable: !currentStatus } : s))
      );
      toast.success(!currentStatus ? "Service activated" : "Service paused");
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteService = async (serviceId, serviceTitle) => {
    if (confirm(`Are you sure you want to delete service "${serviceTitle}"?`)) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "services", serviceId));
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
      try {
        await updateDoc(doc(db, "users", user.uid, "appointments", appointmentId), { status: newStatus });
      } catch {
        // Ignore
      }
      try {
        await updateDoc(doc(db, "appointments", appointmentId), { status: newStatus });
      } catch {
        // Ignore
      }

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
    (s.title || "").toLowerCase().includes(searchQuery.toLowerCase())
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
            Services & Slot Schedule
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure service offerings, weekly day/time slot schedules, and bookings.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <PlusSquare className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Tabs */}
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
          <span>Appointments ({appointments.length})</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Service Catalog Grid */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search service title..."
              className="w-full bg-white dark:bg-[#1A1A1A] border border-[#DDD8CF] dark:border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs font-medium outline-none text-[#1A1A1A] dark:text-white"
            />
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
              Loading service catalog...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
              <Wrench className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">No Services Found</h3>
              <p className="text-xs text-gray-500">Configure your store service catalog to accept bookings.</p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold"
              >
                Add First Service
              </button>
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
                        alt={serv.title}
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
                      <span className="text-[10px] font-bold uppercase text-gray-400">{serv.category}</span>
                      <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mt-0.5">{serv.title}</h3>
                      {serv.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                          {serv.description}
                        </p>
                      )}
                    </div>

                    {/* Weekly Days Schedule Badges */}
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Weekly Availability</p>
                      <div className="flex flex-wrap gap-1">
                        {(serv.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE).map((s) => (
                          <span
                            key={s.day}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              s.enabled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-gray-100 dark:bg-white/5 text-gray-400 line-through"
                            }`}
                          >
                            {s.day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E5E0D8] dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-base text-[#1A1A1A] dark:text-white">
                        {serv.priceType === "variable" ? `Approx. ₹${serv.approxPrice || serv.price}` : `₹${serv.price}`}
                      </span>
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {serv.duration} Mins
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleToggleAvailability(serv.id, serv.isAvailable)}
                        className="text-xs font-bold text-gray-600 dark:text-gray-300 hover:underline"
                      >
                        {serv.isAvailable ? "Pause Service" : "Enable Service"}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(serv)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition"
                          title="Edit Service"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(serv.id, serv.title)}
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
                        {app.clientName}
                      </td>
                      <td className="py-3.5 px-2 font-medium">
                        <a href={`tel:${app.clientPhone}`} className="hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {app.clientPhone}
                        </a>
                      </td>
                      <td className="py-3.5 px-2 text-gray-700 dark:text-gray-300 font-bold">
                        {app.serviceTitle}
                      </td>
                      <td className="py-3.5 px-2 text-gray-500">
                        {app.bookingDate} ({app.bookingTime})
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
                          className="bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-2 py-1 text-xs outline-none text-[#1A1A1A] dark:text-white"
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

      {/* Add / Edit Service Modal with Weekly Day & Time Slot Schedule */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-lg w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative my-8">
            <button
              onClick={() => setBookModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-black text-base text-[#1A1A1A] dark:text-white">
              {editingService ? "Edit Service & Weekly Schedule" : "Add Service & Weekly Schedule"}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Haircut & Grooming"
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pricing Model</label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="variable">Variable / Approx</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    {priceType === "fixed" ? "Price (₹)" : "Approx Price Range"}
                  </label>
                  <input
                    type="text"
                    required
                    value={priceType === "fixed" ? price : approxPrice}
                    onChange={(e) => (priceType === "fixed" ? setPrice(e.target.value) : setApproxPrice(e.target.value))}
                    placeholder={priceType === "fixed" ? "499" : "₹300 - ₹800"}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Slot Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                  >
                    <option value="Salon & Beauty">Salon & Beauty</option>
                    <option value="Healthcare & Clinic">Healthcare & Clinic</option>
                    <option value="Coaching & Tuition">Coaching & Tuition</option>
                    <option value="Repair & Maintenance">Repair & Maintenance</option>
                    <option value="Fitness & Yoga">Fitness & Yoga</option>
                    <option value="General Services">General Services</option>
                  </select>
                </div>
              </div>

              {/* Weekly Available Days & Hours Slot Configuration */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#F7F6F3] dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10">
                <p className="text-[10px] font-bold uppercase text-gray-500">Weekly Availability & Time Slots</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {weeklySchedule.map((sched, idx) => (
                    <div key={sched.day} className="flex items-center justify-between gap-2 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold w-16">
                        <input
                          type="checkbox"
                          checked={sched.enabled}
                          onChange={() => handleToggleDay(idx)}
                          className="rounded text-[#1A1A1A]"
                        />
                        <span>{sched.day}</span>
                      </label>

                      {sched.enabled ? (
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <input
                            type="time"
                            value={sched.startTime}
                            onChange={(e) => handleTimeChange(idx, "startTime", e.target.value)}
                            className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={sched.endTime}
                            onChange={(e) => handleTimeChange(idx, "endTime", e.target.value)}
                            className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Unavailable</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Includes haircut, wash, styling..."
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none resize-none text-[#1A1A1A] dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Saving..." : "Save Service & Schedule"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
