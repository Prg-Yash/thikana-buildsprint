"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import toast from "react-hot-toast";

const CartContext = createContext({
  cartsByBusiness: {},
  loading: true,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeFromCart: async () => {},
  clearBusinessItems: async () => {},
  getGrandTotal: () => 0,
  getTotalItemCount: () => 0,
});

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartsByBusiness, setCartsByBusiness] = useState({});
  const [loading, setLoading] = useState(true);

  // Sync multi-tenant carts from Firestore: users/{user.uid}/carts/{businessId}/products
  useEffect(() => {
    if (!user?.uid) {
      setCartsByBusiness({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const userCartsRef = collection(db, "users", user.uid, "carts");

    // Real-time listener for user's business cart documents
    const unsubscribeUserCarts = onSnapshot(
      userCartsRef,
      async (cartsSnapshot) => {
        try {
          const newCartsMap = {};

          for (const cartDoc of cartsSnapshot.docs) {
            const businessId = cartDoc.id;
            const cartData = cartDoc.data();
            const businessName = cartData.businessName || "Local Merchant";

            // Fetch products subcollection for this business
            const productsRef = collection(
              db,
              "users",
              user.uid,
              "carts",
              businessId,
              "products"
            );
            const productsSnap = await getDocs(productsRef);

            const productsList = [];
            productsSnap.forEach((pDoc) => {
              const pData = pDoc.data();
              productsList.push({
                id: pDoc.id,
                name: pData.name || pData.title || "Product",
                price: parseFloat(pData.price || 0),
                quantity: parseInt(pData.quantity || 1, 10),
                imageUrl: pData.imageUrl || pData.image || "",
                businessId,
                businessName,
                ...pData,
              });
            });

            if (productsList.length > 0) {
              newCartsMap[businessId] = {
                businessId,
                businessName,
                products: productsList,
              };
            } else {
              // Clean up empty business cart document
              try {
                await deleteDoc(doc(db, "users", user.uid, "carts", businessId));
              } catch (e) {
                // Ignore cleanup error
              }
            }
          }

          setCartsByBusiness(newCartsMap);
        } catch (err) {
          console.error("Error loading multi-store cart:", err);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Cart subscription error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribeUserCarts();
  }, [user?.uid]);

  // Add Item to Cart
  const addToCart = async (product, businessId, businessName = "Local Merchant") => {
    if (!user?.uid) {
      toast.error("Please sign in to add items to your shopping cart.");
      return;
    }

    const bId = businessId || product.businessId || "default_store";
    const productId = product.id || `prod_${Date.now()}`;
    const toastId = toast.loading("Adding item to cart...");

    try {
      // 1. Ensure parent business cart doc exists
      const busCartRef = doc(db, "users", user.uid, "carts", bId);
      await setDoc(busCartRef, { businessName, updatedAt: new Date().toISOString() }, { merge: true });

      // 2. Reference item doc
      const itemRef = doc(db, "users", user.uid, "carts", bId, "products", productId);
      const itemSnap = await getDoc(itemRef);

      if (itemSnap.exists()) {
        const existingQty = itemSnap.data().quantity || 1;
        await updateDoc(itemRef, {
          quantity: existingQty + 1,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await setDoc(itemRef, {
          name: product.name || product.title || "Product",
          price: parseFloat(product.price || 0),
          quantity: 1,
          imageUrl: product.imageUrl || product.image || "",
          businessId: bId,
          businessName,
          addedAt: new Date().toISOString(),
        });
      }

      toast.success(`Added ${product.name || "item"} to cart!`, { id: toastId });
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast.error(`Failed to add item: ${err.message}`, { id: toastId });
    }
  };

  // Update Item Quantity (+ or -)
  const updateQuantity = async (businessId, productId, newQuantity) => {
    if (!user?.uid) return;

    if (newQuantity < 1) {
      await removeFromCart(businessId, productId);
      return;
    }

    try {
      const itemRef = doc(db, "users", user.uid, "carts", businessId, "products", productId);
      await updateDoc(itemRef, {
        quantity: parseInt(newQuantity, 10),
        updatedAt: new Date().toISOString(),
      });
      toast.success("Cart updated");
    } catch (err) {
      console.error("Error updating quantity:", err);
      toast.error("Failed to update quantity");
    }
  };

  // Remove single item from cart & cleanup empty business cart folders
  const removeFromCart = async (businessId, productId) => {
    if (!user?.uid) return;

    const toastId = toast.loading("Removing item from cart...");
    try {
      const itemRef = doc(db, "users", user.uid, "carts", businessId, "products", productId);
      await deleteDoc(itemRef);

      // Check if any products remain in this business cart
      const productsRef = collection(db, "users", user.uid, "carts", businessId, "products");
      const snap = await getDocs(productsRef);

      if (snap.empty) {
        await deleteDoc(doc(db, "users", user.uid, "carts", businessId));
      }

      toast.success("Item removed from cart", { id: toastId });
    } catch (err) {
      console.error("Error removing item:", err);
      toast.error("Failed to remove item", { id: toastId });
    }
  };

  // Clear all items for a checked-out store
  const clearBusinessItems = async (businessId) => {
    if (!user?.uid || !businessId) return;

    try {
      const productsRef = collection(db, "users", user.uid, "carts", businessId, "products");
      const snap = await getDocs(productsRef);

      const deletePromises = snap.docs.map((pDoc) => deleteDoc(pDoc.ref));
      await Promise.all(deletePromises);

      // Delete parent business cart doc
      await deleteDoc(doc(db, "users", user.uid, "carts", businessId));
    } catch (err) {
      console.error(`Error clearing cart for business ${businessId}:`, err);
    }
  };

  // Metric Computations
  const getGrandTotal = () => {
    let grand = 0;
    Object.values(cartsByBusiness).forEach((store) => {
      store.products.forEach((p) => {
        grand += p.price * p.quantity;
      });
    });
    return grand;
  };

  const getTotalItemCount = () => {
    let count = 0;
    Object.values(cartsByBusiness).forEach((store) => {
      store.products.forEach((p) => {
        count += p.quantity;
      });
    });
    return count;
  };

  return (
    <CartContext.Provider
      value={{
        cartsByBusiness,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearBusinessItems,
        getGrandTotal,
        getTotalItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
