"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { PostCard } from "@/components/PostCard";
import {
  MapPin,
  CheckCircle2,
  UserPlus,
  UserCheck,
  PhoneCall,
  Navigation,
  Clock,
  Store,
  Grid,
  ShoppingBag,
  Info,
  Calendar,
  X,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";

export default function StorefrontPage({ params }) {
  const unwrappedParams = use(params);
  const username = unwrappedParams?.username || "";

  const [storeData, setStoreData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "products" | "services" | "info"
  const [isFollowing, setIsFollowing] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useEffect(() => {
    async function loadStorefrontData() {
      setLoading(true);
      try {
        let fetchedStore = null;
        let bizId = null;

        // Query Firestore `businesses` or `users` collection by username
        const qBiz = query(collection(db, "businesses"), where("username", "==", username));
        const bizSnap = await getDocs(qBiz);

        if (!bizSnap.empty) {
          const bDoc = bizSnap.docs[0].data();
          bizId = bDoc.adminId || bDoc.ownerId || bizSnap.docs[0].id;
          fetchedStore = {
            id: bizId,
            ...bDoc,
            name: bDoc.businessName || bDoc.adminName || "Local Merchant",
            logo: bDoc.profilePic || bDoc.avatar || bDoc.logo || "",
            coverImage: bDoc.coverPic || bDoc.coverImage || "",
            address: bDoc.locationAddress || bDoc.address?.formatted || "Location address not set",
            operatingHours: Array.isArray(bDoc.operationalHours)
              ? bDoc.operationalHours.filter(h => h.enabled).map(h => `${h.day}: ${h.openTime}-${h.closeTime}`).join(", ") || "Mon-Sat 9 AM - 8 PM"
              : bDoc.operatingHours || "Mon-Sat 9 AM - 8 PM",
            bio: bDoc.bio || bDoc.description || (bDoc.businessTags ? bDoc.businessTags.join(" • ") : "Verified local merchant on Thikana."),
          };
        } else {
          const qUsers = query(collection(db, "users"), where("username", "==", username));
          const userSnap = await getDocs(qUsers);
          if (!userSnap.empty) {
            const uDoc = userSnap.docs[0].data();
            bizId = uDoc.uid || userSnap.docs[0].id;
            fetchedStore = {
              id: bizId,
              ...uDoc,
              name: uDoc.name || uDoc.displayName || "Local Merchant",
              logo: uDoc.profilePic || uDoc.avatar || "",
              coverImage: uDoc.coverPic || "",
              address: uDoc.locationAddress || "Location address not set",
              operatingHours: "Mon-Sat 9 AM - 8 PM",
              bio: uDoc.bio || "Verified local business on Thikana.",
            };
          }
        }

        setStoreData(fetchedStore);

        if (bizId) {
          // Helper to normalize raw Firestore post docs into expected PostCard fields
          const normalizePostDoc = (id, data, defaultBizName, defaultBizAvatar, defaultUsername) => {
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

            return {
              id,
              ...data,
              businessName: data.businessName || defaultBizName,
              businessAvatar: data.businessAvatar || defaultBizAvatar,
              username: data.username || defaultUsername,
              caption,
              images,
              category: data.category || data.businessType || "General",
              likeCount,
              commentCount,
              isVerified: true,
            };
          };

          const defaultName = fetchedStore?.name || "Local Merchant";
          const defaultAvatar = fetchedStore?.logo || "";

          // Fetch business posts by uid, userId, businessId, or username
          try {
            const postsMap = new Map();

            const qUid = query(collection(db, "posts"), where("uid", "==", bizId));
            const uidSnap = await getDocs(qUid);
            uidSnap.docs.forEach((d) => postsMap.set(d.id, normalizePostDoc(d.id, d.data(), defaultName, defaultAvatar, username)));

            const qUser = query(collection(db, "posts"), where("userId", "==", bizId));
            const userSnap = await getDocs(qUser);
            userSnap.docs.forEach((d) => postsMap.set(d.id, normalizePostDoc(d.id, d.data(), defaultName, defaultAvatar, username)));

            const qBiz = query(collection(db, "posts"), where("businessId", "==", bizId));
            const bizSnapPosts = await getDocs(qBiz);
            bizSnapPosts.docs.forEach((d) => postsMap.set(d.id, normalizePostDoc(d.id, d.data(), defaultName, defaultAvatar, username)));

            const qUserHandle = query(collection(db, "posts"), where("username", "==", username));
            const handleSnap = await getDocs(qUserHandle);
            handleSnap.docs.forEach((d) => postsMap.set(d.id, normalizePostDoc(d.id, d.data(), defaultName, defaultAvatar, username)));

            setPosts(Array.from(postsMap.values()));
          } catch (err) {
            console.warn("Could not fetch store posts:", err);
          }

          // Fetch business products catalog for this specific business (bizId)
          try {
            const prodMap = new Map();

            // 1. Check top-level products collection where userId == bizId or merchantId == bizId
            try {
              const qProd1 = query(collection(db, "products"), where("userId", "==", bizId));
              const pSnap1 = await getDocs(qProd1);
              pSnap1.docs.forEach((d) => prodMap.set(d.id, { id: d.id, ...d.data() }));

              const qProd2 = query(collection(db, "products"), where("merchantId", "==", bizId));
              const pSnap2 = await getDocs(qProd2);
              pSnap2.docs.forEach((d) => prodMap.set(d.id, { id: d.id, ...d.data() }));
            } catch {
              // Ignore
            }

            // 2. Check user-scoped subcollection users/{bizId}/products
            try {
              const subProdSnap = await getDocs(collection(db, "users", bizId, "products"));
              subProdSnap.docs.forEach((d) => prodMap.set(d.id, { id: d.id, ...d.data() }));
            } catch {
              // Ignore
            }

            setProducts(Array.from(prodMap.values()));
          } catch (err) {
            console.warn("Could not fetch store products:", err);
          }

          // Fetch business services catalog for this specific business (bizId)
          try {
            const servMap = new Map();

            // 1. Check top-level services collection
            try {
              const qServ1 = query(collection(db, "services"), where("userId", "==", bizId));
              const sSnap1 = await getDocs(qServ1);
              sSnap1.docs.forEach((d) => servMap.set(d.id, { id: d.id, ...d.data() }));

              const qServ2 = query(collection(db, "services"), where("merchantId", "==", bizId));
              const sSnap2 = await getDocs(qServ2);
              sSnap2.docs.forEach((d) => servMap.set(d.id, { id: d.id, ...d.data() }));
            } catch {
              // Ignore
            }

            // 2. Check user-scoped subcollection users/{bizId}/services
            try {
              const subServSnap = await getDocs(collection(db, "users", bizId, "services"));
              subServSnap.docs.forEach((d) => servMap.set(d.id, { id: d.id, ...d.data() }));
            } catch {
              // Ignore
            }

            setServices(Array.from(servMap.values()));
          } catch (err) {
            console.warn("Could not fetch store services:", err);
          }
        }
      } catch (err) {
        console.error("Error loading storefront:", err);
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      loadStorefrontData();
    }
  }, [username]);

  const handleOpenDirections = () => {
    if (storeData?._geoloc) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${storeData._geoloc.lat},${storeData._geoloc.lng}`;
      window.open(url, "_blank");
    } else {
      toast.error("Store location coordinates not available.");
    }
  };

  const handleRequestCall = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;

    try {
      await addDoc(collection(db, "call_requests"), {
        merchantId: storeData?.id || null,
        merchantName: storeData?.name || "Merchant",
        phoneNumber: phoneNumber.trim(),
        status: "Pending",
        createdAt: serverTimestamp(),
      });
      toast.success("Callback request submitted! Merchant will reach out shortly.");
    } catch (err) {
      console.error("Error submitting call request:", err);
      toast.error("Failed to submit call request");
    } finally {
      setCallModalOpen(false);
      setPhoneNumber("");
    }
  };

  const [existingBookedSlots, setExistingBookedSlots] = useState([]);

  // Fetch already booked slots when date changes
  useEffect(() => {
    async function fetchBookedSlots() {
      if (!storeData?.id || !bookingDate) {
        setExistingBookedSlots([]);
        return;
      }
      try {
        const qApp = query(
          collection(db, "appointments"),
          where("merchantId", "==", storeData.id),
          where("bookingDate", "==", bookingDate)
        );
        const appSnap = await getDocs(qApp);
        const bookedTimeSlots = [];
        appSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.status !== "Cancelled" && data.bookingTime) {
            bookedTimeSlots.push(data.bookingTime);
          }
        });
        setExistingBookedSlots(bookedTimeSlots);
      } catch {
        // Ignore
      }
    }

    fetchBookedSlots();
  }, [storeData?.id, bookingDate]);

  const getAvailableSlotsForDate = (dateStr) => {
    if (!dateStr || !selectedService?.weeklySchedule) return [];

    const dateObj = new Date(dateStr + "T00:00:00");
    if (isNaN(dateObj.getTime())) return [];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = dayNames[dateObj.getDay()];

    const daySchedule = selectedService.weeklySchedule.find(
      (s) => (s.day || "").toLowerCase() === dayName.toLowerCase()
    );

    if (!daySchedule || !daySchedule.enabled) {
      return [];
    }

    const startH = parseInt((daySchedule.startTime || "09:00").split(":")[0], 10) || 9;
    const startM = parseInt((daySchedule.startTime || "09:00").split(":")[1], 10) || 0;
    const endH = parseInt((daySchedule.endTime || "18:00").split(":")[0], 10) || 18;
    const endM = parseInt((daySchedule.endTime || "18:00").split(":")[1], 10) || 0;

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationMins = selectedService.durationMinutes || selectedService.duration || 30;

    const slots = [];
    const bookedSet = new Set(existingBookedSlots);

    for (let m = startMinutes; m + durationMins <= endMinutes; m += durationMins) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = mins < 10 ? `0${mins}` : mins;
      const slotStr = `${displayH}:${displayM} ${ampm}`;

      // Filter out already booked slots!
      if (!bookedSet.has(slotStr)) {
        slots.push(slotStr);
      }
    }

    return slots;
  };

  const availableSlots = getAvailableSlotsForDate(bookingDate);

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setBookingDate(selectedDate);
    setBookingTime("");

    if (selectedDate && selectedService?.weeklySchedule) {
      const dateObj = new Date(selectedDate + "T00:00:00");
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = dayNames[dateObj.getDay()];

      const daySchedule = selectedService.weeklySchedule.find(
        (s) => (s.day || "").toLowerCase() === dayName.toLowerCase()
      );

      if (!daySchedule || !daySchedule.enabled) {
        toast.error(`Service unavailable on ${dayName}s. Please pick an active day.`);
      }
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim() || !selectedService) return;

    if (availableSlots.length === 0) {
      toast.error("No available slots on selected date. Please pick an active service day.");
      return;
    }

    if (!bookingTime) {
      toast.error("Please select a time slot.");
      return;
    }

    setSubmittingBooking(true);
    const appointmentDoc = {
      merchantId: storeData?.id || "merchant",
      merchantName: storeData?.name || "Merchant",
      serviceId: selectedService.id,
      serviceTitle: selectedService.title || selectedService.name,
      servicePrice: selectedService.price || 0,
      serviceDuration: selectedService.durationMinutes || selectedService.duration || 30,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      bookingDate: bookingDate || new Date().toISOString().split("T")[0],
      bookingTime: bookingTime || "10:00 AM",
      status: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (storeData?.id) {
        try {
          await addDoc(collection(db, "users", storeData.id, "appointments"), appointmentDoc);
        } catch {
          // Ignore
        }
      }
      await addDoc(collection(db, "appointments"), appointmentDoc);

      toast.success("Appointment booking submitted! Merchant will contact you.");
      setBookModalOpen(false);
      setClientName("");
      setClientPhone("");
      setBookingDate("");
      setBookingTime("");
      setSelectedService(null);
    } catch (err) {
      console.error("Error booking appointment:", err);
      toast.error("Failed to submit booking.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="w-full h-48 sm:h-64 rounded-3xl bg-gray-200 dark:bg-gray-800" />
        <div className="flex items-center gap-4 px-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 border-4 border-white dark:border-[#1A1A1A] -mt-10" />
          <div className="space-y-2">
            <div className="w-40 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="w-24 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
        <Store className="w-10 h-10 text-gray-400 mx-auto" />
        <h2 className="text-lg font-black text-[#1A1A1A] dark:text-white">Store Not Found</h2>
        <p className="text-xs text-gray-500">No registered merchant found with handle @{username}.</p>
        <Link href="/feed" className="inline-block px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold">
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Cover Banner & Logo */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 overflow-hidden shadow-sm">
        <div className="relative h-48 sm:h-64 bg-gray-200 dark:bg-gray-800">
          {storeData?.coverImage && (
            <Image
              src={storeData.coverImage}
              alt={storeData?.name || "Store Cover"}
              fill
              className="object-cover"
            />
          )}
        </div>

        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-[#1A1A1A] bg-[#1A1A1A] text-white overflow-hidden shadow-md shrink-0 flex items-center justify-center font-black text-2xl">
                {storeData?.logo ? (
                  <Image
                    src={storeData.logo}
                    alt={storeData?.name || "Store Logo"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>{(storeData?.name || "S").charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
                    {storeData?.name}
                  </h1>
                  {storeData?.isVerified && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">@{storeData?.username}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isFollowing
                    ? "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200"
                    : "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90"
                }`}
              >
                {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isFollowing ? "Following" : "Follow"}</span>
              </button>

              <button
                onClick={handleOpenDirections}
                className="px-4 py-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold text-[#1A1A1A] dark:text-white transition flex items-center gap-1.5"
              >
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>Get Directions</span>
              </button>

              <button
                onClick={() => setCallModalOpen(true)}
                className="p-2.5 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 transition"
                title="Request Call"
              >
                <PhoneCall className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
            {storeData?.bio}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium pt-3 border-t border-[#E5E0D8] dark:border-white/10">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {storeData?.address}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {storeData?.operatingHours}
            </span>
            <span className="font-bold text-[#1A1A1A] dark:text-white">
              {storeData?.followersCount || 0} Followers
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E5E0D8] dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "posts"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Posts Feed ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "products"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Products ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "services"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Services ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === "info"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
              : "text-gray-600 dark:text-gray-400 hover:bg-[#F4F1EA] dark:hover:bg-white/5"
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Store Info</span>
        </button>
      </div>

      {/* 3. Tab Content */}
      <div className="space-y-4">
        {activeTab === "posts" && (
          posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500">
              No store updates published yet.
            </div>
          )
        )}

        {activeTab === "products" && (
          products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod) => (
                <div key={prod.id} className="p-4 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 space-y-3 shadow-sm">
                  {prod.imageUrl && (
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image src={prod.imageUrl} alt={prod.name || "Product"} fill className="object-cover" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-white">{prod.name}</h4>
                    {prod.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{prod.description}</p>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
                    <span className="font-black text-sm text-[#1A1A1A] dark:text-white">₹{prod.price || 0}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Stock: {prod.quantity ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500 space-y-2">
              <ShoppingBag className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="font-bold text-[#1A1A1A] dark:text-white">Store Catalog</p>
              <p>No products listed in catalog yet.</p>
            </div>
          )
        )}

        {activeTab === "services" && (
          services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((serv) => (
                <div key={serv.id} className="p-4 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 space-y-3 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    {serv.imageUrl && (
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <Image src={serv.imageUrl} alt={serv.title || serv.name} fill className="object-cover" />
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400">{serv.category || "General"}</span>
                      <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-white">{serv.title || serv.name}</h4>
                      {serv.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{serv.description}</p>}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2">
                    {/* Weekly Days Schedule Badges */}
                    {Array.isArray(serv.weeklySchedule) && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Available Days</p>
                        <div className="flex flex-wrap gap-1">
                          {serv.weeklySchedule.map((s) => (
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
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-black text-sm text-[#1A1A1A] dark:text-white">
                        {serv.priceType === "variable" ? `Approx. ₹${serv.approxPrice || serv.price}` : `₹${serv.price || 0}`}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5" /> {serv.durationMinutes || serv.duration || 30} Mins
                      </span>
                    </div>
                    {storeData?.acceptAppointments !== false ? (
                      <button
                        onClick={() => {
                          setSelectedService(serv);
                          setBookModalOpen(true);
                        }}
                        className="w-full py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Book Slot
                      </button>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic text-center py-1">Store not accepting appointments currently</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 text-xs text-gray-500 space-y-2">
              <Wrench className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="font-bold text-[#1A1A1A] dark:text-white">Service Catalog</p>
              <p>No service offerings listed yet.</p>
            </div>
          )
        )}

        {activeTab === "info" && (
          <div className="p-6 bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Business Address</h3>
              <p className="text-gray-600 dark:text-gray-300">{storeData?.address}</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Operating Hours</h3>
              <p className="text-gray-600 dark:text-gray-300">{storeData?.operatingHours}</p>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mb-1">Contact Phone</h3>
              <p className="text-gray-600 dark:text-gray-300">{storeData?.phone}</p>
            </div>
          </div>
        )}
      </div>

      {/* Call Modal */}
      {callModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E5E0D8] dark:border-white/10 space-y-5 relative shadow-2xl my-8">
            <button
              onClick={() => setCallModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Callback Inquiry</span>
                <h3 className="font-black text-lg text-[#1A1A1A] dark:text-white">
                  Contact {storeData?.name || "Merchant"}
                </h3>
              </div>
            </div>

            <form onSubmit={handleRequestCall} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                  Your Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] rounded-2xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Submit Phone Inquiry</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {bookModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#E5E0D8] dark:border-white/10 space-y-5 relative shadow-2xl my-8">
            <button
              onClick={() => setBookModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Book Appointment Slot</span>
                <h3 className="font-black text-xl text-[#1A1A1A] dark:text-white">
                  {selectedService.title || selectedService.name}
                </h3>
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <span>
                    {selectedService.priceType === "variable"
                      ? `Approx. ₹${selectedService.approxPrice || selectedService.price}`
                      : `₹${selectedService.price || 0}`}
                  </span>
                  <span>•</span>
                  <span className="text-gray-500 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedService.durationMinutes || selectedService.duration || 30} Mins
                  </span>
                </p>
              </div>
            </div>

            {/* Weekly Days Schedule Overview */}
            {Array.isArray(selectedService.weeklySchedule) && (
              <div className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 space-y-2">
                <p className="text-[10px] font-bold uppercase text-gray-500">Service Working Hours & Days</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {selectedService.weeklySchedule.map((s) => (
                    <div
                      key={s.day}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-between ${
                        s.enabled
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-gray-100 dark:bg-white/5 text-gray-400 line-through"
                      }`}
                    >
                      <span>{s.day}</span>
                      {s.enabled && <span className="text-[9px] font-semibold">{s.startTime}-{s.endTime}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                    Your Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                    Select Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={handleDateChange}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
                    Select Available Time Slot
                  </label>
                  <select
                    required
                    disabled={!bookingDate || availableSlots.length === 0}
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none disabled:opacity-50 focus:border-[#1A1A1A] transition font-bold"
                  >
                    {!bookingDate ? (
                      <option value="">Pick Date First</option>
                    ) : availableSlots.length === 0 ? (
                      <option value="">No Slots on Selected Day</option>
                    ) : (
                      <>
                        <option value="">Select Time Slot</option>
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingBooking || availableSlots.length === 0}
                className="w-full py-3.5 bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] rounded-2xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                <span>{submittingBooking ? "Confirming Booking..." : "Confirm Appointment"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
