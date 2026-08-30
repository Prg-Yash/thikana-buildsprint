"use client";

import React from "react";
import { CartProvider } from "@/context/CartContext";
import { CartPage } from "@/components/cart/CartPage";

export default function CartRoutePage() {
  return (
    <CartProvider>
      <CartPage />
    </CartProvider>
  );
}
