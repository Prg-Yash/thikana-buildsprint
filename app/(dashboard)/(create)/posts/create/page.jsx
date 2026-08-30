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
  CheckCircle,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  PhoneCall,
  Bot,
  RefreshCw,
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
  const [isGeneratingAICaption, setIsGeneratingAICaption] = useState(false);

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

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerateAICaption = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one photo first so AI can analyze the image!");
      return;
    }

    setIsGeneratingAICaption(true);
    try {
      const imageBase64 = await fileToBase64(images[0].file);

      const response = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          personaId: "cmo",
          imageBase64,
          query: `Analyze this uploaded store photo and write a short 2-sentence viral promotional feed post caption for category '${selectedCategory}'. Describe what is shown in the photo with catchy emojis and a call to action. Do not include markdown headers or hashes.`,
        }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accum = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accum += decoder.decode(value, { stream: true });
        setCaption(accum.slice(0, MAX_CAPTION_LENGTH));
      }

      toast.success("AI Caption generated from photo!");
    } catch (err) {
      console.error("AI Caption error:", err);
      toast.error("Failed to generate AI caption from image");
    } finally {
      setIsGeneratingAICaption(false);
    }
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
      let businessGeoloc = null;
      let businessGeohash = null;
      let businessName = user?.displayName || "Local Merchant";
      let businessAvatar = user?.photoURL || "";

      if (user?.uid) {
        try {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            businessName = data.businessName || data.displayName || data.name || businessName;
            businessAvatar = data.profilePic || data.avatar || data.logo || businessAvatar;
            if (data._geoloc?.lat && data._geoloc?.lng) {
              businessGeoloc = data._geoloc;
              businessGeohash = encodeGeohash(data._geoloc.lat, data._geoloc.lng, 5);
            }
          }
        } catch (err) {
          console.warn("Could not fetch user profile details for geo-tagging:", err);
        }
      }

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

      const postData = {
        userId: user?.uid || null,
        uid: user?.uid || null,
        businessId: user?.uid || null,
        businessName,
        businessAvatar,
        username: user?.displayName ? user.displayName.toLowerCase().replace(/\s+/g, "-") : "store",
        caption: caption.trim(),
        content: caption.trim(),
        description: caption.trim(),
        category: selectedCategory,
        images: uploadedImageUrls,
        imageUrl: uploadedImageUrls[0] || null,
        likesCount: 0,
        likeCount: 0,
        isVerified: true,
        _geoloc: businessGeoloc,
        geohash: businessGeohash,
        createdAt: serverTimestamp(),
        createdAtFormatted: "Just now",
      };

      await addDoc(collection(db, "posts"), postData);

      setUploadProgress(100);
      toast.success("Post published to hyperlocal feed!");
      router.push("/feed");
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error(err.message || "Failed to publish post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hyperlocal Feed Studio</span>
        </div>
      </div>

      {/* 2-Column Studio Grid: Editor Form (7 cols) + Live Feed Card Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Create Store Post
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Publish real-time offers, new inventory drops, or announcements to shoppers within 10 km.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Image Upload Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
                Photos (Max 5)
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 group shadow-2xs">
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
                    <ImagePlus className="w-6 h-6 mb-1 text-gray-400" />
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

            {/* 2. Caption Textarea with AI Generator Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
                  Caption / Details
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateAICaption}
                    disabled={isGeneratingAICaption}
                    className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    {isGeneratingAICaption ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Generating Draft...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5" />
                        <span>Generate AI Caption</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] font-medium text-gray-400">
                    {caption.length} / {MAX_CAPTION_LENGTH}
                  </span>
                </div>
              </div>

              <textarea
                rows={4}
                maxLength={MAX_CAPTION_LENGTH}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's happening at your store today? Add discount details, item availability, or operating hours..."
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-4 text-xs sm:text-sm text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] resize-none leading-relaxed"
              />
            </div>

            {/* 3. Category Selector */}
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
                          ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                          : "bg-[#F7F6F3] dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Notice */}
            <div className="p-4 rounded-2xl bg-[#EEEAE4] dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <MapPin className="w-4 h-4 text-[#4A7C6F] shrink-0" />
                <span className="font-medium text-[#1A1A1A] dark:text-gray-200">
                  Store location coordinates attached for 10 km feed ranking.
                </span>
              </div>
            </div>

            {/* Progress Bar */}
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

        {/* Right Column: Live Feed Card Preview (5 cols) */}
        <aside className="lg:col-span-5 space-y-4 sticky top-20">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-600" /> Live Feed Preview
            </span>
            <span className="text-[10px] font-bold text-gray-400">As shown in customer feed</span>
          </div>

          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-5 shadow-sm space-y-4 pointer-events-none">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-sm">
                  {user?.photoURL ? (
                    <Image src={user.photoURL} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <span>{(user?.displayName || "S").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-[#1A1A1A] dark:text-white">
                      {user?.displayName || "Your Merchant Store"}
                    </span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium mt-0.5">
                    <span className="text-[#4A7C6F] font-bold bg-[#4A7C6F]/10 px-2 py-0.5 rounded-full">
                      0.8 km away
                    </span>
                    <span>Just now</span>
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F4F1EA] dark:bg-white/10 text-[#1A1A1A] dark:text-gray-200">
                {selectedCategory}
              </span>
            </div>

            {/* Media Image Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[4/3]">
              {images.length > 0 ? (
                <Image src={images[0].previewUrl} alt="Preview" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 space-y-1">
                  <ImagePlus className="w-8 h-8 opacity-50" />
                  <span className="text-xs font-bold opacity-60">Photo Preview</span>
                </div>
              )}
            </div>

            {/* Caption Preview */}
            <p className="text-xs text-[#333] dark:text-gray-200 leading-relaxed font-normal min-h-[40px]">
              {caption || "Your post details, discounts, and store announcement text will appear here..."}
            </p>

            {/* Mock Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D8] dark:border-white/10 opacity-70">
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> 0</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> 0</span>
                <Share2 className="w-4 h-4" />
              </div>
              <button className="bg-[#1A1A1A] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5" /> Request Call
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
