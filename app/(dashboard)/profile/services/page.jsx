"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import {
  subscribeUserServices,
  subscribeUserAppointments,
  saveServiceItem,
  deleteServiceItem,
} from "@/lib/services-operations";
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
  ImagePlus,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  User,
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
  const fileInputRef = useRef(null);

  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("services"); // "services" | "appointments"
  const [searchQuery, setSearchQuery] = useState("");
  const [appointmentViewMode, setAppointmentViewMode] = useState("calendar"); // "calendar" | "table"
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState(DEFAULT_WEEKLY_SCHEDULE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // CANONICAL SHARED SERVICE LAYER REAL-TIME LISTENERS
    const unsubServices = subscribeUserServices(
      user.uid,
      (fetchedServices) => {
        setServices(fetchedServices);
        setLoading(false);
      },
      (err) => {
        setError("Failed to load services catalog.");
        setLoading(false);
      }
    );

    const unsubAppointments = subscribeUserAppointments(
      user.uid,
      (fetchedAppointments) => {
        setAppointments(fetchedAppointments);
      },
      () => {}
    );

    return () => {
      unsubServices();
      unsubAppointments();
    };
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
    setImageFile(null);
    setImagePreview("");
    setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
    setBookModalOpen(true);
  };

  const handleOpenEditModal = (serv) => {
    setEditingService(serv);
    setTitle(serv.title || serv.name || "");
    setPriceType(serv.priceType || (serv.approxPrice ? "variable" : "fixed"));
    setPrice(String(serv.price || ""));
    setApproxPrice(serv.approxPrice || "");
    setDuration(String(serv.duration || serv.durationMinutes || "30"));
    setCategory(serv.category || "Salon & Beauty");
    setDescription(serv.description || "");
    setImageFile(null);
    setImagePreview(serv.imageUrl || "");
    setWeeklySchedule(Array.isArray(serv.weeklySchedule) ? serv.weeklySchedule : DEFAULT_WEEKLY_SCHEDULE);
    setBookModalOpen(true);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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

    const getCategoryFallbackImage = (cat, titleStr) => {
      const lower = (cat + " " + titleStr).toLowerCase();
      if (lower.includes("food") || lower.includes("catering") || lower.includes("pizza") || lower.includes("bakery") || lower.includes("dining") || lower.includes("party")) {
        return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80";
      }
      if (lower.includes("clinic") || lower.includes("health") || lower.includes("medical") || lower.includes("doctor")) {
        return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80";
      }
      if (lower.includes("repair") || lower.includes("maintenance") || lower.includes("mechanic")) {
        return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80";
      }
      if (lower.includes("fitness") || lower.includes("gym") || lower.includes("yoga")) {
        return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80";
      }
      if (lower.includes("tuition") || lower.includes("coaching") || lower.includes("education")) {
        return "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80";
      }
      return "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80";
    };

    setIsSubmitting(true);

    try {
      let downloadUrl = imagePreview;

      if (imageFile) {
        const storageRef = ref(storage, `services/${user.uid}_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);
        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null,
            (err) => reject(err),
            async () => {
              downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const serviceDoc = {
        id: editingService?.id,
        title: title.trim(),
        name: title.trim(),
        priceType,
        price: parseFloat(price || "0"),
        approxPrice: priceType === "variable" ? approxPrice.trim() : null,
        duration: parseInt(duration || "30", 10),
        durationMinutes: parseInt(duration || "30", 10),
        category,
        description: description.trim(),
        imageUrl: downloadUrl.trim() || getCategoryFallbackImage(category, title),
        weeklySchedule,
        isAvailable: editingService ? editingService.isAvailable ?? true : true,
      };

      await saveServiceItem(user.uid, serviceDoc);
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
      await saveServiceItem(user.uid, { id: serviceId, isAvailable: !currentStatus });
      toast.success(!currentStatus ? "Service activated" : "Service paused");
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteService = async (serviceId, serviceTitle) => {
    if (confirm(`Are you sure you want to delete service "${serviceTitle}"?`)) {
      try {
        await deleteServiceItem(user.uid, serviceId);
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

  const getDaysInMonthGrid = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    for (let i = 0; i < firstDay; i++) {
      grid.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(year, month, d));
    }
    return grid;
  };

  const formatISOYYYYMMDD = (d) => {
    if (!d) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
              Streaming real-time service catalog...
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
        <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/10">
            <div>
              <h2 className="text-base font-black text-[#1A1A1A] dark:text-white">
                Incoming Client Appointments
              </h2>
              <p className="text-xs text-gray-500">Track and manage time slots booked by clients.</p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-[#F7F6F3] dark:bg-[#262626] p-1 rounded-2xl border border-[#E5E0D8] dark:border-white/10 self-start sm:self-auto">
              <button
                onClick={() => setAppointmentViewMode("calendar")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  appointmentViewMode === "calendar"
                    ? "bg-white dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-[#1A1A1A] dark:hover:text-white"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>

              <button
                onClick={() => setAppointmentViewMode("table")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  appointmentViewMode === "table"
                    ? "bg-white dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-[#1A1A1A] dark:hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-400 space-y-2">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-bold text-[#1A1A1A] dark:text-white">No Appointment Bookings Yet</p>
              <p>Appointments booked by clients from your public storefront will appear here.</p>
            </div>
          ) : appointmentViewMode === "calendar" ? (
            /* Interactive Monthly Calendar View */
            <div className="space-y-4">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-black text-[#1A1A1A] dark:text-white">
                  {currentMonthDate.toLocaleString("en-US", { month: "long", year: "numeric" })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setCurrentMonthDate(
                        new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
                      )
                    }
                    className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonthDate(new Date())}
                    className="px-2.5 py-1 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] text-[11px] font-bold text-[#1A1A1A] dark:text-white"
                  >
                    Today
                  </button>
                  <button
                    onClick={() =>
                      setCurrentMonthDate(
                        new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
                      )
                    }
                    className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-gray-400">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {getDaysInMonthGrid(currentMonthDate).map((cellDate, idx) => {
                  if (!cellDate) {
                    return <div key={`empty_${idx}`} className="h-28 rounded-2xl bg-gray-50/50 dark:bg-white/2" />;
                  }

                  const dateStr = formatISOYYYYMMDD(cellDate);
                  const isToday = formatISOYYYYMMDD(new Date()) === dateStr;

                  // Find appointments on this day
                  const dayApps = appointments.filter((a) => {
                    const bookingDateStr = (a.bookingDate || "").trim();
                    return bookingDateStr === dateStr || (a.createdAt?.seconds && formatISOYYYYMMDD(new Date(a.createdAt.seconds * 1000)) === dateStr);
                  });

                  return (
                    <div
                      key={dateStr}
                      className={`h-28 rounded-2xl p-2 border flex flex-col justify-between overflow-y-auto ${
                        isToday
                          ? "border-[#1A1A1A] dark:border-white bg-[#F7F6F3] dark:bg-[#222]"
                          : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#1A1A1A]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black ${
                            isToday
                              ? "w-5 h-5 rounded-full bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center text-[10px]"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {cellDate.getDate()}
                        </span>
                        {dayApps.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[9px]">
                            {dayApps.length}
                          </span>
                        )}
                      </div>

                      {/* Time Block Cards */}
                      <div className="space-y-1 my-1">
                        {dayApps.map((a) => (
                          <div
                            key={a.id}
                            className={`p-1.5 rounded-xl text-[10px] font-bold border leading-tight ${
                              (a.status || "").toLowerCase() === "confirmed"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                : (a.status || "").toLowerCase() === "completed"
                                ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            }`}
                          >
                            <p className="truncate">{a.clientName}</p>
                            <p className="text-[9px] opacity-80">{a.bookingTime}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Table View */
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

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-[#E5E0D8] dark:border-white/10 space-y-5 relative my-8 shadow-2xl">
            <button
              onClick={() => setBookModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-xl text-[#1A1A1A] dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
              {editingService ? "Edit Service & Weekly Schedule" : "Add Service & Weekly Schedule"}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                  Service Cover Photo
                </label>
                {imagePreview ? (
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full hover:bg-black transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 rounded-2xl border-2 border-dashed border-[#DDD8CF] dark:border-white/20 flex flex-col items-center justify-center text-gray-500 bg-[#F7F6F3] dark:bg-[#222222] hover:border-[#1A1A1A] transition"
                  >
                    <ImagePlus className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">Upload Custom Cover Photo</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                  Service Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Haircut & Grooming"
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                    Pricing Model
                  </label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none font-bold"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="variable">Variable / Approx</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                    {priceType === "fixed" ? "Price (₹)" : "Approx Price Range"}
                  </label>
                  <input
                    type="text"
                    required
                    value={priceType === "fixed" ? price : approxPrice}
                    onChange={(e) => (priceType === "fixed" ? setPrice(e.target.value) : setApproxPrice(e.target.value))}
                    placeholder={priceType === "fixed" ? "499" : "300 - 800"}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
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

              {/* Weekly Days Schedule */}
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
