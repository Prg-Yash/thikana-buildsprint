"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Package,
  Upload,
  X,
  ImagePlus,
  ArrowLeft,
  Sparkles,
  Tag,
  IndianRupee,
  Layers,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Food & Dining",
  "Fashion & Apparel",
  "Electronics",
  "Groceries",
  "Beauty & Wellness",
  "Home & Decor",
  "Services",
  "General",
];

export default function AddProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [hsn, setHsn] = useState("999406");
  const [gst, setGst] = useState("5");
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

    if (!name.trim()) {
      toast.error("Please enter a product name");
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

      // 1. Upload Product Image to Firebase Storage if selected
      if (imageFile) {
        const fileRef = ref(storage, `products/${user?.uid || "anon"}_${Date.now()}`);
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

      // 2. Save Product to Firestore `products` collection
      const productData = {
        userId: user?.uid || null,
        merchantId: user?.uid || null,
        name: name.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        quantity: parseInt(quantity || "0", 10),
        hsn: hsn.trim(),
        gst: parseInt(gst || "0", 10),
        imageUrl: downloadUrl || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "products"), productData);

      setUploadProgress(100);
      toast.success("Product added to inventory catalog!");
      router.push("/products");
    } catch (err) {
      console.error("Error adding product:", err);
      toast.error(err.message || "Failed to add product");
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
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
          <Package className="w-3.5 h-3.5" />
          <span>Inventory Listing</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1
            className="text-2xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Add New Product Item
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            List catalog items, configure prices, stock quantities, and GST rates for local shoppers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Product Image Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
              Product Photo
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
                <span className="text-xs font-bold">Upload Product Photo</span>
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

          {/* 2. Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Product Title / Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sourdough Artisan Bread"
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
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Pricing & Discount */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Regular Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299"
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Sale Price (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="249"
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="50"
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A]"
              />
            </div>
          </div>

          {/* 4. GST & HSN Tax Codes */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#EEEAE4] dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                HSN Code
              </label>
              <input
                type="text"
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                placeholder="999406"
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3 py-2 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                GST Rate (%)
              </label>
              <select
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3 py-2 text-xs outline-none"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          {/* 5. Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Freshly baked artisan bread made with organic flour..."
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-3 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] resize-none"
            />
          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                <span>Saving Product...</span>
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
            <span>{isSubmitting ? "Saving..." : "Add to Catalog"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
