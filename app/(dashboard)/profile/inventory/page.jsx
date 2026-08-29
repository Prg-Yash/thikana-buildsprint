"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
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
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProfileInventoryPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStockVal, setEditingStockVal] = useState("");

  // Edit product modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editHsn, setEditHsn] = useState("");
  const [editGst, setEditGst] = useState("");
  const [updatingProduct, setUpdatingProduct] = useState(false);

  useEffect(() => {
    async function loadProductsData() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // SOURCE SPECIFIC PATH: users/{userId}/products
        const subSnap = await getDocs(collection(db, "users", user.uid, "products"));
        const fetched = subSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProducts(fetched);
      } catch (err) {
        console.error("Error loading products:", err);
        setError("Failed to load product inventory.");
      } finally {
        setLoading(false);
      }
    }

    loadProductsData();
  }, [user]);

  const handleUpdateStock = async (prodId) => {
    const newQty = parseInt(editingStockVal, 10);
    if (isNaN(newQty) || newQty < 0) {
      toast.error("Invalid stock quantity");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid, "products", prodId), { quantity: newQty });

      setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, quantity: newQty } : p))
      );
      setEditingStockId(null);
      toast.success("Stock quantity updated!");
    } catch (err) {
      console.error("Error updating stock:", err);
      toast.error("Failed to update stock");
    }
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    setUpdatingProduct(true);
    const updatedFields = {
      name: editName.trim(),
      price: parseFloat(editPrice || "0"),
      salePrice: editSalePrice ? parseFloat(editSalePrice) : null,
      category: editCategory,
      quantity: parseInt(editQuantity || "0", 10),
      hsn: editHsn.trim(),
      gst: parseInt(editGst || "0", 10),
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, "users", user.uid, "products", editingProduct.id), updatedFields);

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...updatedFields } : p))
      );
      setEditingProduct(null);
      toast.success("Product details updated!");
    } catch (err) {
      console.error("Error updating product:", err);
      toast.error("Failed to update product details");
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleDeleteProduct = async (prodId, prodName) => {
    if (confirm(`Are you sure you want to delete "${prodName}" from inventory?`)) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "products", prodId));
        setProducts((prev) => prev.filter((p) => p.id !== prodId));
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
      (prod.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      (prod.category || "").toLowerCase() === selectedCategory.toLowerCase();

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
            Manage user-scoped product catalog, stock availability, pricing, and GST tax codes.
          </p>
        </div>

        <Link
          href="/add-product"
          className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <PlusSquare className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

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
          Loading catalog inventory...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 space-y-3">
          <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white">No Products in Inventory</h3>
          <p className="text-xs text-gray-500">Add products to your catalog so customers can view and purchase items.</p>
          <Link
            href="/add-product"
            className="inline-block px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold"
          >
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((prod) => {
            const stockQty = prod.quantity ?? 0;
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

                    {editingStockId === prod.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editingStockVal}
                          onChange={(e) => setEditingStockVal(e.target.value)}
                          className="w-14 bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] rounded-lg px-2 py-1 text-xs text-center font-bold"
                        />
                        <button
                          onClick={() => handleUpdateStock(prod.id)}
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
                        onClick={() => {
                          setEditingProduct(prod);
                          setEditName(prod.name || "");
                          setEditPrice(String(prod.price || ""));
                          setEditSalePrice(String(prod.salePrice || ""));
                          setEditCategory(prod.category || "General");
                          setEditQuantity(String(prod.quantity || "0"));
                          setEditHsn(prod.hsn || "");
                          setEditGst(String(prod.gst || "5"));
                        }}
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

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 max-w-md w-full border border-[#E5E0D8] dark:border-white/10 space-y-4 relative">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-black text-base text-[#1A1A1A] dark:text-white">Edit Product Details</h3>

            <form onSubmit={handleSaveProductEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stock Qty</label>
                  <input
                    type="number"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl p-2.5 outline-none text-[#1A1A1A] dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingProduct}
                className="w-full py-3 mt-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{updatingProduct ? "Saving..." : "Save Product Details"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
