"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Wrench,
  Upload,
  X,
  ImagePlus,
  ArrowLeft,
  Clock,
  IndianRupee,
  Tag,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

const SERVICE_CATEGORIES = [
  "Salon & Beauty",
  "Healthcare & Clinic",
  "Coaching & Tuition",
  "Repair & Maintenance",
  "Fitness & Yoga",
  "Consulting & Legal",
  "Photography & Event",
  "General Services",
];

export default function AddServicePage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Salon & Beauty");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30"); // in minutes
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a service title");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      let downloadUrl = "";

      if (imageFile) {
        const fileRef = ref(storage, `services/${user?.uid || "anon"}_${Date.now()}`);
        const uploadTask = uploadBytesResumable(fileRef, imageFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 80
              );
              setUploadProgress(10 + progress);
            },
            (error) => reject(error),
            async () => {
              downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      setUploadProgress(90);

      const serviceData = {
        userId: user?.uid || null,
        merchantId: user?.uid || null,
        title: title.trim(),
        name: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price),
        durationMinutes: parseInt(duration || "30", 10),
        imageUrl: downloadUrl || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
        isAvailable: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "services"), serviceData);

      setUploadProgress(100);
      toast.success("Service added to catalog!");
      router.push("/services");
    } catch (err) {
      console.error("Error adding service:", err);
      toast.error(err.message || "Failed to add service");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full">
          <Wrench className="w-3.5 h-3.5" />
          <span>Service Listing</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1
            className="text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Add New Service Offering
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure service offerings, appointment slot durations, and pricing for local clients.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Service Cover Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
              Service Photo
            </label>

            {imagePreview ? (
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 group">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-[#DDD8CF] dark:border-white/20 hover:border-[#1A1A1A] dark:hover:border-white flex flex-col items-center justify-center p-4 text-gray-500 hover:text-[#1A1A1A] dark:hover:text-white transition bg-[#F7F6F3] dark:bg-[#222222]"
              >
                <ImagePlus className="w-7 h-7 mb-1" />
                <span className="text-xs font-bold">Upload Service Photo</span>
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

          {/* 2. Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Service Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hair Styling & Grooming"
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Pricing & Slot Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Service Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="499"
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Duration (Minutes)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              >
                <option value="15">15 Mins</option>
                <option value="30">30 Mins</option>
                <option value="45">45 Mins</option>
                <option value="60">1 Hour</option>
                <option value="90">1.5 Hours</option>
                <option value="120">2 Hours</option>
              </select>
            </div>
          </div>

          {/* 4. Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
              Description / Inclusions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Includes consultation, hair wash, styling, and scalp massage..."
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-3 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] resize-none"
            />
          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                <span>Saving Service Offering...</span>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isSubmitting ? "Saving..." : "Add Service"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
