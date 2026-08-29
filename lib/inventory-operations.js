import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Real-time inventory listener for canonical path users/{userId}/products
export function subscribeUserInventory(userId, callback, onError) {
  if (!userId) return () => {};
  const colRef = collection(db, "users", userId, "products");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(products);
    },
    (err) => {
      console.error("Inventory real-time listener error:", err);
      if (onError) onError(err);
    }
  );
}

// Add or Update Product Item
export async function saveProductItem(userId, productData, imageFile = null) {
  if (!userId) throw new Error("User ID is required");

  let imageUrl = productData.imageUrl || "";

  if (imageFile) {
    const storageRef = ref(storage, `products/${userId}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);
    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null,
        (err) => reject(err),
        async () => {
          imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve();
        }
      );
    });
  }

  const prodId = productData.id || doc(collection(db, "users", userId, "products")).id;
  const docData = {
    ...productData,
    id: prodId,
    userId,
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80",
    price: parseFloat(productData.price || "0"),
    salePrice: productData.salePrice ? parseFloat(productData.salePrice) : null,
    quantity: parseInt(productData.quantity || "0", 10),
    gst: parseInt(productData.gst || "5", 10),
    updatedAt: serverTimestamp(),
    createdAt: productData.createdAt || serverTimestamp(),
  };

  // Write exclusively to canonical user subcollection users/{userId}/products
  await setDoc(doc(db, "users", userId, "products", prodId), docData, { merge: true });

  return { id: prodId, ...docData };
}

// Bulk update quantities
export async function bulkUpdateStockQuantities(userId, updatesArray) {
  if (!userId || !Array.isArray(updatesArray)) return;
  const batch = writeBatch(db);

  updatesArray.forEach(({ id, quantity }) => {
    const subRef = doc(db, "users", userId, "products", id);
    batch.update(subRef, { quantity: parseInt(quantity, 10), updatedAt: serverTimestamp() });
  });

  await batch.commit();
}

// Delete Product from canonical user subcollection
export async function deleteProductItem(userId, productId) {
  if (!userId || !productId) return;
  await deleteDoc(doc(db, "users", userId, "products", productId));
}
