"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import geohash from "ngeohash";
import {
  Search,
  MapPin,
  Store,
  Tag,
  Grid,
  Map as MapIcon,
  Phone,
  ArrowRight,
  Filter,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

const RADIUS_OPTIONS = [
  { label: "Within 2 km", value: 2 },
  { label: "Within 5 km", value: 5 },
  { label: "Within 10 km", value: 10 },
  { label: "All Locations", value: null },
];

const CATEGORY_OPTIONS = [
  "All",
  "Food & Dining",
  "Fashion",
  "Electronics",
  "Groceries",
  "Services",
];

// Haversine distance formula in kilometers
function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedRadius, setSelectedRadius] = useState(null); // null = All
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "map"

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState({ lat: 18.5204, lng: 73.8567 }); // Pune default
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const mapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);

  // Fetch Maps API key securely
  useEffect(() => {
    fetch("/api/maps/key")
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) setMapsApiKey(data.apiKey);
        else setMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
      })
      .catch(() => {
        setMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
      });
  }, []);

  // Get user location via navigator
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos?.coords) {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          }
        },
        () => {}
      );
    }
  }, []);

  // Fetch business stores strictly from Firestore (excluding normal consumer accounts)
  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const fetchedMap = new Map();

        // 1. Query `businesses` collection
        const qBiz = query(collection(db, "businesses"), limit(50));
        const bizSnap = await getDocs(qBiz);
        bizSnap.forEach((d) => {
          const data = d.data();
          const bizName = data.businessName || data.name || "Local Business";
          const username = data.username || bizName.toLowerCase().replace(/[^\w]+/g, "-");
          fetchedMap.set(d.id, {
            id: d.id,
            username,
            ...data,
            businessName: bizName,
          });
        });

        // 2. Query `users` collection specifically where accountType == "business" or isBusiness == true
        const qUsers = query(collection(db, "users"), limit(100));
        const usersSnap = await getDocs(qUsers);
        usersSnap.forEach((d) => {
          const uData = d.data();
          if (
            uData.accountType === "business" ||
            uData.isBusiness === true ||
            uData.businessName ||
            uData.role === "business"
          ) {
            if (!fetchedMap.has(d.id)) {
              const bizName = uData.businessName || uData.displayName || uData.name || "Local Business";
              const username = uData.username || bizName.toLowerCase().replace(/[^\w]+/g, "-");
              fetchedMap.set(d.id, {
                id: d.id,
                username,
                ...uData,
                businessName: bizName,
              });
            }
          }
        });

        setBusinesses(Array.from(fetchedMap.values()));
      } catch (err) {
        console.error("Error fetching businesses for search:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  // Filter businesses based on search text, category, and radius
  const filteredBusinesses = businesses.filter((item) => {
    // 1. Extract string parameters safely across schema variations
    const businessNameStr =
      typeof item.businessName === "string"
        ? item.businessName
        : typeof item.name === "string"
        ? item.name
        : "";

    const categoryStr =
      typeof item.category === "string"
        ? item.category
        : typeof item.business_type === "string"
        ? item.business_type
        : Array.isArray(item.business_categories)
        ? item.business_categories.join(" ")
        : "";

    const locationStr =
      typeof item.locationAddress === "string"
        ? item.locationAddress
        : typeof item.address?.formatted === "string"
        ? item.address.formatted
        : "";

    const tagsStr = Array.isArray(item.businessTags) ? item.businessTags.join(" ") : "";

    const matchesSearch =
      !searchQuery.trim() ||
      businessNameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      locationStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tagsStr.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Category filter matching
    const sCat = selectedCategory.toLowerCase();
    const pCat = categoryStr.toLowerCase();
    const matchesCategory =
      selectedCategory === "All" ||
      pCat === sCat ||
      pCat.includes(sCat) ||
      sCat.includes(pCat);

    // 3. Distance Radius filter using safely extracted coordinates
    let matchesRadius = true;
    const lat =
      item._geoloc?.lat ?? item.coordinates?.lat ?? item.location?.latitude ?? item.location?.lat;
    const lng =
      item._geoloc?.lng ?? item.coordinates?.lng ?? item.location?.longitude ?? item.location?.lng;

    if (selectedRadius && lat !== undefined && lng !== undefined) {
      const dist = getHaversineDistanceKm(
        userLocation.lat,
        userLocation.lng,
        parseFloat(lat),
        parseFloat(lng)
      );
      matchesRadius = dist !== null && dist <= selectedRadius;
    }

    return matchesSearch && matchesCategory && matchesRadius;
  });

  // Render Map Pin View
  useEffect(() => {
    if (viewMode !== "map" || !scriptLoaded || !window.google || !mapContainerRef.current) {
      return;
    }

    const google = window.google;

    // Initialize Map instance once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
        center: userLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      });
    }

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    filteredBusinesses.forEach((b) => {
      if (b._geoloc?.lat && b._geoloc?.lng) {
        hasCoords = true;
        const pos = { lat: b._geoloc.lat, lng: b._geoloc.lng };
        bounds.extend(pos);

        const titleStr = typeof b.businessName === "string" ? b.businessName : "Store";
        const catStr = typeof b.category === "string" ? b.category : "Retail";
        const addrStr =
          typeof b.address?.formatted === "string"
            ? b.address.formatted
            : typeof b.location === "string"
            ? b.location
            : "";

        const marker = new google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: titleStr,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: sans-serif;">
              <h4 style="margin: 0; font-weight: bold; font-size: 14px;">${titleStr}</h4>
              <p style="margin: 4px 0 0; font-size: 12px; color: #555;">${catStr}</p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #888;">${addrStr}</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
      }
    });

    if (hasCoords) {
      mapInstanceRef.current.fitBounds(bounds);
    } else {
      mapInstanceRef.current.setCenter(userLocation);
    }
  }, [viewMode, scriptLoaded, filteredBusinesses, userLocation]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Asynchronous Google Maps Script for Map Pin View */}
      {mapsApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
        />
      )}

      {/* 1. Search Bar & View Mode Toggle */}
      <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local businesses, services, or products..."
              className="w-full bg-[#F7F6F3] dark:bg-[#252525] border border-transparent focus:border-[#1A1A1A] dark:focus:border-white rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-[#1A1A1A] dark:text-white placeholder-gray-400 outline-none transition"
            />
          </div>

          {/* 4. Toggle between Grid view and Map pin view */}
          <div className="flex items-center gap-1 bg-[#F7F6F3] dark:bg-[#252525] p-1.5 rounded-2xl border border-[#DDD8CF] dark:border-white/10 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                viewMode === "grid"
                  ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A]"
              }`}
            >
              <Grid className="w-4 h-4" /> Grid View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                viewMode === "map"
                  ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A]"
              }`}
            >
              <MapIcon className="w-4 h-4" /> Map View
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="pt-4 border-t border-[#E5E0D8] dark:border-white/10 space-y-3">
          {/* 2. Distance Radius Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Radius:
            </span>
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setSelectedRadius(opt.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                  selectedRadius === opt.value
                    ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
                    : "bg-[#F7F6F3] dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-[#EEEAE4]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 3. Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Category:
            </span>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                  selectedCategory === cat
                    ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]"
                    : "bg-[#F7F6F3] dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-[#EEEAE4]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content View (Grid vs Map) */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A] dark:text-white" />
          <p className="text-xs font-bold text-gray-500">Discovering local stores...</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        filteredBusinesses.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-12 text-center border border-[#E5E0D8] dark:border-white/10 space-y-3">
            <Store className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white">No businesses found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try adjusting your search terms or expanding your distance radius filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBusinesses.map((item) => {
              const distanceKm =
                item._geoloc?.lat && item._geoloc?.lng
                  ? getHaversineDistanceKm(
                      userLocation.lat,
                      userLocation.lng,
                      item._geoloc.lat,
                      item._geoloc.lng
                    )
                  : null;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-5 border border-[#E5E0D8] dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-[#1A1A1A] dark:hover:border-white transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEEAE4] dark:bg-[#282828] text-[#1A1A1A] dark:text-white flex items-center justify-center font-black text-base shrink-0">
                        {item.businessName ? String(item.businessName).charAt(0).toUpperCase() : "S"}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#F7F6F3] dark:bg-[#252525] text-[11px] font-extrabold text-gray-600 dark:text-gray-300">
                        {typeof item.category === "string" ? item.category : "Retail"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white group-hover:underline">
                        {typeof item.businessName === "string" ? item.businessName : "Local Business"}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">
                          {typeof item.address?.formatted === "string"
                            ? item.address.formatted
                            : typeof item.location === "string"
                            ? item.location
                            : "Location not set"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs font-bold text-gray-500">
                    {distanceKm !== null ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ~{distanceKm.toFixed(1)} km away
                      </span>
                    ) : (
                      <span>Nearby</span>
                    )}
                    <Link
                      href={`/store/${item.username || item.id}`}
                      className="text-[#1A1A1A] dark:text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      Visit <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Map Pin View */
        <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-sm">
          <div
            ref={mapContainerRef}
            className="w-full h-[550px] rounded-2xl overflow-hidden border border-[#E5E0D8] dark:border-white/10 bg-gray-100 dark:bg-gray-800"
          />
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-xs font-bold text-gray-500">
          Loading discovery search...
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
