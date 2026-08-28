"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { encodeGeohash } from "@/lib/geohash";
import toast from "react-hot-toast";
import {
  MapPin,
  Search,
  Navigation,
  CheckCircle2,
  Loader2,
  Store,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function StoreLocationPicker() {
  const { user } = useAuth();
  const router = useRouter();

  const [mapsApiKey, setMapsApiKey] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [geocoder, setGeocoder] = useState(null);

  const [coordinates, setCoordinates] = useState({ lat: 18.5204, lng: 73.8567 }); // Default Pune
  const [formattedAddress, setFormattedAddress] = useState("");
  const [addressComponents, setAddressComponents] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const geocoderRef = useRef(null);
  const isMapInitializedRef = useRef(false);

  // 1. Fetch API key securely from server API route
  useEffect(() => {
    fetch("/api/maps/key")
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          setMapsApiKey(data.apiKey);
        } else {
          setMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
        }
      })
      .catch(() => {
        setMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
      });
  }, []);

  // Fetch existing business coordinates on load if set
  useEffect(() => {
    if (!user?.uid) return;
    const fetchBusinessLoc = async () => {
      try {
        const docSnap = await getDoc(doc(db, "businesses", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data._geoloc?.lat && data._geoloc?.lng) {
            const initialCoords = { lat: data._geoloc.lat, lng: data._geoloc.lng };
            setCoordinates(initialCoords);
            if (mapInstanceRef.current && markerInstanceRef.current) {
              mapInstanceRef.current.setCenter(initialCoords);
              markerInstanceRef.current.setPosition(initialCoords);
            }
          }
          if (data.address?.formatted) {
            setFormattedAddress(data.address.formatted);
          }
        }
      } catch (err) {
        console.error("Error fetching business location:", err);
      }
    };
    fetchBusinessLoc();
  }, [user?.uid]);

  // Reverse geocoding function
  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        setFormattedAddress(results[0].formatted_address);
        setAddressComponents(results[0].address_components);
      } else {
        toast.error("Could not resolve address for selected coordinates");
      }
    });
  }, []);

  // Initialize Map ONCE when script loaded
  const initMap = useCallback(() => {
    if (!window.google || !mapRef.current || isMapInitializedRef.current) return;

    isMapInitializedRef.current = true;
    const google = window.google;
    const geo = new google.maps.Geocoder();
    geocoderRef.current = geo;
    setGeocoder(geo);

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: coordinates,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    const markerInstance = new google.maps.Marker({
      position: coordinates,
      map: mapInstance,
      draggable: true,
      animation: google.maps.Animation.DROP,
      title: "Store Location",
    });

    mapInstanceRef.current = mapInstance;
    markerInstanceRef.current = markerInstance;
    setMap(mapInstance);
    setMarker(markerInstance);

    // Initial reverse geocode
    reverseGeocode(coordinates.lat, coordinates.lng);

    // Drag marker event
    markerInstance.addListener("dragend", () => {
      const pos = markerInstance.getPosition();
      const newLat = pos.lat();
      const newLng = pos.lng();
      setCoordinates({ lat: newLat, lng: newLng });
      reverseGeocode(newLat, newLng);
    });

    // Map click event
    mapInstance.addListener("click", (e) => {
      const clickedLat = e.latLng.lat();
      const clickedLng = e.latLng.lng();
      markerInstance.setPosition(e.latLng);
      setCoordinates({ lat: clickedLat, lng: clickedLng });
      reverseGeocode(clickedLat, clickedLng);
    });

    // Google Places Autocomplete or PlaceAutocompleteElement fallback
    if (searchInputRef.current && google.maps.places) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
          fields: ["geometry", "formatted_address", "name", "address_components"],
        });

        autocomplete.bindTo("bounds", mapInstance);

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            toast.error("No location details available for selected place.");
            return;
          }

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          mapInstance.setCenter({ lat, lng });
          mapInstance.setZoom(17);
          markerInstance.setPosition({ lat, lng });

          setCoordinates({ lat, lng });
          setFormattedAddress(place.formatted_address || place.name || "");
          setAddressComponents(place.address_components || null);
        });
      } catch (err) {
        console.warn("Places Autocomplete fallback notice:", err);
      }
    }
  }, [reverseGeocode]);

  useEffect(() => {
    if (scriptLoaded && window.google) {
      initMap();
    }
  }, [scriptLoaded, initMap]);

  // 3. 'Use Current Location' button using navigator.geolocation
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCoordinates({ lat, lng });

        if (map && marker) {
          map.setCenter({ lat, lng });
          map.setZoom(17);
          marker.setPosition({ lat, lng });
        }

        reverseGeocode(lat, lng);
        setIsLocating(false);
        toast.success("Updated to your current location!");
      },
      (error) => {
        setIsLocating(false);
        toast.error(`Geolocation error: ${error.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  // 6. On submit, save {_geoloc: {lat, lng}, address} to business doc and update location_index
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.uid) {
      toast.error("Please log in to save store location");
      return;
    }

    if (!coordinates.lat || !coordinates.lng) {
      toast.error("Please select a valid location on the map");
      return;
    }

    setIsSaving(true);
    try {
      // 5-character geohash cell (~4.9km x 4.9km area cell)
      const gHash5 = encodeGeohash(coordinates.lat, coordinates.lng, 5);
      const gHash8 = encodeGeohash(coordinates.lat, coordinates.lng, 8);

      const addressData = {
        formatted: formattedAddress,
        components: addressComponents || [],
      };

      const geoData = {
        lat: coordinates.lat,
        lng: coordinates.lng,
        geohash: gHash8,
        geohash5: gHash5,
      };

      // Update business document
      const businessRef = doc(db, "businesses", user.uid);
      await setDoc(
        businessRef,
        {
          ownerId: user.uid,
          _geoloc: geoData,
          coordinates: { lat: coordinates.lat, lng: coordinates.lng },
          address: addressData,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update location_index collection with 5-char geohash cell
      const locationIndexRef = doc(db, "location_index", `${gHash5}_${user.uid}`);
      await setDoc(
        locationIndexRef,
        {
          businessId: user.uid,
          geohash5: gHash5,
          geohash: gHash8,
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: formattedAddress,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      toast.success("Store location saved successfully!");
      router.push("/feed");
    } catch (err) {
      console.error("Error saving store location:", err);
      toast.error(err.message || "Failed to save location");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* 1. Asynchronous Google Maps Script Loading */}
      {mapsApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places,geometry`}
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
        />
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-black">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-[#1A1A1A] dark:text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Set Store Location
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Pinpoint your store on Google Maps so local customers can discover you.
            </p>
          </div>
        </div>

        <button
          onClick={handleCurrentLocation}
          disabled={isLocating}
          className="bg-[#EEEAE4] dark:bg-[#2A2A2A] hover:bg-[#E2DDD5] dark:hover:bg-[#333] text-[#1A1A1A] dark:text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border border-[#DDD8CF] dark:border-white/10 shrink-0"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1A1A1A] dark:text-white" />
          ) : (
            <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}
          Use Current Location
        </button>
      </div>

      {!mapsApiKey && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Google Maps API key is missing. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</span>
        </div>
      )}

      {/* Search Input for Places Autocomplete */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search landmark, street, or locality name..."
          className="w-full bg-white dark:bg-[#1A1A1A] border border-[#DDD8CF] dark:border-white/10 focus:border-[#1A1A1A] dark:focus:border-white rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-[#1A1A1A] dark:text-white placeholder-gray-400 outline-none shadow-sm transition"
        />
      </div>

      {/* Interactive Map Section */}
      <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-sm space-y-4">
        <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-[#E5E0D8] dark:border-white/10 bg-gray-100 dark:bg-gray-800">
          <div ref={mapRef} className="w-full h-full" />
          {!scriptLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-xs gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A] dark:text-white" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                Loading Google Maps...
              </span>
            </div>
          )}
        </div>

        {/* Selected Location Address Details */}
        <div className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400">
                Selected Address
              </span>
              <p className="text-xs font-bold text-[#1A1A1A] dark:text-white mt-0.5">
                {formattedAddress || "Click or drag pin on map to select store location"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSaving || !scriptLoaded}
            className="w-full sm:w-auto bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 shadow-md shrink-0"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Confirm Store Location <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
