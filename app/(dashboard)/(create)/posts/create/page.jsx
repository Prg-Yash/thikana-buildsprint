"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { encodeGeohash } from "@/lib/geohash";
import {
  ImagePlus,
  X,
  Upload,
  Tag,
  MapPin,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["Offers", "New Arrivals", "Announcement", "Discount", "Event", "General"];

export default function CreatePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [caption, setCaption] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Offers");
  const [images, setImages] = useState([]); // array of { file, previewUrl }
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MAX_CAPTION_LENGTH = 500;

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed per post.");
      return;
    }

    const newImageObjs = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImageObjs]);
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!caption.trim() && images.length === 0) {
      toast.error("Please add a caption or upload at least one photo.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      // 1. Fetch business geo-location from Firestore
      let businessGeoloc = null;
      let businessGeohash = null;
      let businessName = user?.displayName || "Local Merchant";
      let businessAvatar = user?.photoURL || "";

      if (user?.uid) {
        try {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            businessName = data.businessName || data.displayName || businessName;
            businessAvatar = data.logo || data.avatar || businessAvatar;
            if (data._geoloc?.lat && data._geoloc?.lng) {
              businessGeoloc = data._geoloc;
              businessGeohash = encodeGeohash(data._geoloc.lat, data._geoloc.lng, 5);
            }
          }
        } catch (err) {
          console.warn("Could not fetch user profile details for geo-tagging:", err);
        }
      }

      // 2. Upload images to Firebase Storage
      const uploadedImageUrls = [];
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const item = images[i];
          const fileRef = ref(storage, `posts/${user?.uid || "anon"}_${Date.now()}_${i}`);
          const uploadTask = uploadBytesResumable(fileRef, item.file);

          await new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const stepProgress = Math.round(
                  ((i + snapshot.bytesTransferred / snapshot.totalBytes) / images.length) * 80
                );
                setUploadProgress(10 + stepProgress);
              },
              (error) => reject(error),
              async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                uploadedImageUrls.push(downloadUrl);
                resolve();
              }
            );
          });
        }
      }

      setUploadProgress(90);

      // 3. Save post to Firestore `posts` collection
      const postData = {
        userId: user?.uid || null,
        businessId: user?.uid || null,
        businessName,
        businessAvatar,
        username: user?.displayName ? user.displayName.toLowerCase().replace(/\s+/g, "-") : "store",
        caption: caption.trim(),
        category: selectedCategory,
        images: uploadedImageUrls,
        imageUrl: uploadedImageUrls[0] || null,
        likesCount: 0,
        isVerified: true,
        _geoloc: businessGeoloc,
        geohash: businessGeohash,
        createdAt: serverTimestamp(),
        createdAtFormatted: "Just now",
      };

      await addDoc(collection(db, "posts"), postData);

      setUploadProgress(100);
      toast.success("Post published successfully!");
      router.push("/feed");
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error(err.message || "Failed to publish post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hyperlocal Post</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1
            className="text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Create New Store Update
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Share local offers, new inventory drops, or announcements with customers nearby.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Image Drag & Drop / File Upload */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
              Photos (Max 5)
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 group">
                  <Image src={img.previewUrl} alt={`Upload ${idx}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#DDD8CF] dark:border-white/20 hover:border-[#1A1A1A] dark:hover:border-white flex flex-col items-center justify-center p-2 text-gray-500 hover:text-[#1A1A1A] dark:hover:text-white transition bg-[#F7F6F3] dark:bg-[#222222]"
                >
                  <ImagePlus className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">Add Photo</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* 2. Caption Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
                Caption / Details
              </label>
              <span className="text-[11px] font-medium text-gray-400">
                {caption.length} / {MAX_CAPTION_LENGTH}
              </span>
            </div>

            <textarea
              rows={4}
              maxLength={MAX_CAPTION_LENGTH}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening at your shop today? Add discount details, item availability, or operating hours..."
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-4 text-xs sm:text-sm text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] resize-none"
            />
          </div>

          {/* 3. Category Tag Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Category Tag
            </label>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-sm"
                        : "bg-[#F7F6F3] dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geo-tag indicator */}
          <div className="p-4 rounded-2xl bg-[#EEEAE4] dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-[#4A7C6F] shrink-0" />
              <span className="font-medium text-[#1A1A1A] dark:text-gray-200">
                Store location coordinates will be attached automatically for spatial feed ranking.
              </span>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                <span>Publishing Post...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-[#1A1A1A] dark:bg-white transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isSubmitting ? "Publishing..." : "Publish Post"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
