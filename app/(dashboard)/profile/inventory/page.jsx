"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeUserInventory,
  saveProductItem,
  bulkUpdateStockQuantities,
  deleteProductItem,
} from "@/lib/inventory-operations";
import {
  PlusSquare,
  Search,
  Filter,
  Edit2,
  Trash2,
  ShoppingBag,
  Check,
  X,
  AlertCircle,
  BarChart2,
  Upload,
  ImagePlus,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProfileInventoryPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Inline Stock Edit
  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStockVal, setEditingStockVal] = useState("");

  // Product Add / Edit Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [quantity, setQuantity] = useState("10");
  const [hsn, setHsn] = useState("999406");
  const [gst, setGst] = useState("5");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Edit Stock Mode
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkStockMap, setBulkStockMap] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // CANONICAL REAL-TIME LISTENER: users/{userId}/products
    const unsubscribe = subscribeUserInventory(
      user.uid,
      (fetchedProducts) => {
        setProducts(fetchedProducts);
        setLoading(false);
      },
      (err) => {
        setError("Failed to stream inventory data from database.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setPrice("");
    setSalePrice("");
    setCategory("Food & Dining");
    setQuantity("10");
    setHsn("999406");
    setGst("5");
    setImageFile(null);
    setImagePreview("");
    setProductModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setName(prod.name || "");
    setDescription(prod.description || "");
    setPrice(String(prod.price || ""));
    setSalePrice(prod.salePrice ? String(prod.salePrice) : "");
    setCategory(prod.category || "General");
    setQuantity(String(prod.quantity ?? 0));
    setHsn(prod.hsn || prod.hsn_or_sac_code || "999406");
    setGst(String(prod.gst ?? prod.gst_rate ?? 5));
    setImageFile(null);
    setImagePreview(prod.imageUrl || "");
    setProductModalOpen(true);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim() || !user?.uid) return;

    setIsSubmitting(true);
    try {
      const pData = {
        id: editingProduct?.id,
        name: name.trim(),
        description: description.trim(),
        category,
        price,
        salePrice,
        quantity,
        hsn,
        gst,
        imageUrl: imagePreview,
      };

      await saveProductItem(user.uid, pData, imageFile);
      setProductModalOpen(false);
      toast.success(editingProduct ? "Product updated!" : "Product added!");
    } catch (err) {
      console.error("Error saving product:", err);
      toast.error("Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStockInline = async (prodId) => {
    const newQty = parseInt(editingStockVal, 10);
    if (isNaN(newQty) || newQty < 0) {
      toast.error("Invalid stock quantity");
      return;
    }

    try {
      await saveProductItem(user.uid, { id: prodId, quantity: newQty });
      setEditingStockId(null);
      toast.success("Stock quantity updated!");
    } catch (err) {
      console.error("Error updating stock:", err);
      toast.error("Failed to update stock");
    }
  };

  const handleSaveBulkStock = async () => {
    const updates = Object.entries(bulkStockMap).map(([id, quantity]) => ({ id, quantity }));
    if (updates.length === 0) {
      setBulkEditMode(false);
      return;
    }

    try {
      await bulkUpdateStockQuantities(user.uid, updates);
      setBulkEditMode(false);
      setBulkStockMap({});
      toast.success("Bulk stock quantities updated!");
    } catch (err) {
      console.error("Bulk stock update error:", err);
      toast.error("Failed to apply bulk stock updates.");
    }
  };

  const handleDeleteProduct = async (prodId, prodName) => {
    if (confirm(`Are you sure you want to delete "${prodName}" from inventory?`)) {
      try {
        await deleteProductItem(user.uid, prodId);
        toast.success("Product removed from inventory.");
      } catch (err) {
        console.error("Error deleting product:", err);
        toast.error("Failed to delete product.");
      }
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      (prod.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    const pCat = (prod.category || "").toLowerCase().trim();
    const sCat = selectedCategory.toLowerCase().trim();

    const matchesCategory =
      selectedCategory === "all" ||
      (pCat.length > 0 && pCat === sCat) ||
      (pCat.length > 0 && pCat.includes(sCat)) ||
      (pCat.length > 0 && sCat.includes(pCat));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Inventory Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time user catalog inventory, stock alerts, GST codes, and image upload.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bulkEditMode ? (
            <button
              onClick={handleSaveBulkStock}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" /> Save Bulk Stock
            </button>
          ) : (
            <button
              onClick={() => {
                const map = {};
                products.forEach((p) => (map[p.id] = p.quantity ?? 0));
                setBulkStockMap(map);
                setBulkEditMode(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold text-[#1A1A1A] dark:text-white transition flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Bulk Edit Stock</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <PlusSquare className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Inventory KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-gray-400">Total Items</p>
          <p className="text-xl font-black text-[#1A1A1A] dark:text-white mt-1">{products.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-gray-400">Stock Valuation</p>
          <p className="text-xl font-black text-[#1A1A1A] dark:text-white mt-1">
            ₹
            {products
              .reduce((acc, p) => acc + parseFloat(p.price || "0") * parseInt(p.quantity || "0", 10), 0)
              .toLocaleString()}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-gray-400">Low / Out Stock</p>
          <p className="text-xl font-black text-amber-600 mt-1">
            {products.filter((p) => (p.quantity ?? 0) <= 5).length} Items
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-gray-400">Total Sales Value</p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            ₹
            {products
              .reduce((acc, p) => {
                const rev = parseFloat(p.totalRevenue || "0");
                return acc + (isNaN(rev) ? 0 : rev);
              }, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] p-4 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product title or category..."
            className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-transparent focus:border-[#1A1A1A] dark:focus:border-white/20 rounded-2xl py-2 pl-10 pr-4 text-xs font-medium outline-none text-[#1A1A1A] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-3 py-2 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Food & Dining">Food & Dining</option>
            <option value="Fashion & Apparel">Fashion & Apparel</option>
            <option value="Electronics">Electronics</option>
            <option value="Groceries">Groceries</option>
            <option value="Beauty & Wellness">Beauty & Wellness</option>
            <option value="Home & Decor">Home & Decor</option>
            <option value="Services">Services</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Product Inventory Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
          Streaming real-time catalog inventory...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
          <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">No Products in Inventory</h3>
          <p className="text-xs text-gray-500">Add products to your catalog so customers can view and purchase items.</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold"
          >
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((prod) => {
            const stockQty = bulkEditMode ? (bulkStockMap[prod.id] ?? prod.quantity ?? 0) : (prod.quantity ?? 0);
            const isLowStock = stockQty > 0 && stockQty <= 5;
            const isOutOfStock = stockQty === 0;

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-5 shadow-sm space-y-4 hover:border-[#C8B99A] transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={prod.imageUrl || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80"}
                      alt={prod.name}
                      fill
                      className="object-cover"
                    />

                    <span
                      className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-xs ${
                        isOutOfStock
                          ? "bg-red-500 text-white"
                          : isLowStock
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        {prod.category || "General"}
                      </span>
                      {prod.gst !== undefined && (
                        <span className="text-[10px] font-bold text-gray-400">GST: {prod.gst}%</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white mt-0.5 line-clamp-1">
                      {prod.name}
                    </h3>
                    {prod.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E0D8] dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-base text-[#1A1A1A] dark:text-white">
                          ₹{prod.price || 0}
                        </span>
                        {prod.salePrice && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{prod.salePrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {bulkEditMode ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-400">Stock:</span>
                        <input
                          type="number"
                          value={bulkStockMap[prod.id] ?? 0}
                          onChange={(e) =>
                            setBulkStockMap({ ...bulkStockMap, [prod.id]: e.target.value })
                          }
                          className="w-16 bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-lg px-2 py-1 text-xs text-center font-bold"
                        />
                      </div>
                    ) : editingStockId === prod.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editingStockVal}
                          onChange={(e) => setEditingStockVal(e.target.value)}
                          className="w-14 bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] rounded-lg px-2 py-1 text-xs text-center font-bold"
                        />
                        <button
                          onClick={() => handleUpdateStockInline(prod.id)}
                          className="px-2 py-1 rounded-lg bg-[#1A1A1A] text-white text-[10px] font-bold"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingStockId(prod.id);
                          setEditingStockVal(String(stockQty));
                        }}
                        className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-[#F7F6F3] dark:bg-[#262626] px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-gray-200"
                        title="Click to edit stock"
                      >
                        <span>Stock: {stockQty}</span>
                        <Edit2 className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={`/profile/analytics/${prod.id}`}
                      className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                    >
                      <BarChart2 className="w-3.5 h-3.5" /> Product Analytics
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative my-8 shadow-2xl">
            <button
              onClick={() => setProductModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-xl text-[#1A1A1A] dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
              {editingProduct ? "Edit Product Details" : "Add Product to Inventory"}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Product Photo</label>
                {imagePreview ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full hover:bg-black transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 rounded-2xl border-2 border-dashed border-[#DDD8CF] dark:border-white/20 flex flex-col items-center justify-center text-gray-400 bg-[#F7F6F3] dark:bg-[#222222] hover:border-[#1A1A1A] transition"
                  >
                    <ImagePlus className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">Upload Custom Product Photo</span>
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
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Product Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Graphic Print T-Shirt"
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none text-[#1A1A1A] dark:text-white focus:border-[#1A1A1A] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Regular Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="699"
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none text-[#1A1A1A] dark:text-white focus:border-[#1A1A1A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Sale Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="499 (Optional)"
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none text-[#1A1A1A] dark:text-white focus:border-[#1A1A1A] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none text-[#1A1A1A] dark:text-white font-bold"
                  >
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Fashion & Apparel">Fashion & Apparel</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Beauty & Wellness">Beauty & Wellness</option>
                    <option value="Home & Decor">Home & Decor</option>
                    <option value="Services">Services</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none text-[#1A1A1A] dark:text-white focus:border-[#1A1A1A] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">HSN Code</label>
                  <input
                    type="text"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    placeholder="999411"
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none text-[#1A1A1A] dark:text-white focus:border-[#1A1A1A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">GST Rate (%)</label>
                  <select
                    value={gst}
                    onChange={(e) => setGst(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none text-[#1A1A1A] dark:text-white font-bold"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description and material details..."
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3 outline-none resize-none text-[#1A1A1A] dark:text-white focus:border-[#1A1A1A] transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] rounded-2xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Saving Details..." : "Save Product Details"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
