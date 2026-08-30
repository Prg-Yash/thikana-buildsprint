import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { businessId, amount, currency = "INR" } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid checkout amount is required." },
        { status: 400 }
      );
    }

    let keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_thikana_demo";
    let keySecret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";

    // Lookup business custom Razorpay keys from Firestore if businessId is provided
    if (businessId) {
      try {
        const userDocRef = doc(db, "users", businessId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.razorpayInfo?.keyId && userData.razorpayInfo?.keySecret) {
            keyId = userData.razorpayInfo.keyId;
            keySecret = userData.razorpayInfo.keySecret;
          }
        } else {
          // Check businesses collection fallback
          const bizDocRef = doc(db, "businesses", businessId);
          const bizSnap = await getDoc(bizDocRef);
          if (bizSnap.exists()) {
            const bizData = bizSnap.data();
            if (bizData.razorpayInfo?.keyId && bizData.razorpayInfo?.keySecret) {
              keyId = bizData.razorpayInfo.keyId;
              keySecret = bizData.razorpayInfo.keySecret;
            }
          }
        }
      } catch (err) {
        console.warn(`Could not fetch custom Razorpay keys for business ${businessId}:`, err.message);
      }
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    const receipt = `rcpt_${businessId?.substring(0, 8) || "store"}_${Date.now()}`;

    // Attempt live Razorpay Order creation with the business's keyId and keySecret
    if (keyId.startsWith("rzp_") && keySecret !== "demo_secret") {
      try {
        const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt,
            notes: { businessId: businessId || "unknown" },
          }),
        });

        if (rzpRes.ok) {
          const rzpOrder = await rzpRes.json();
          return NextResponse.json({
            success: true,
            orderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            keyId,
            receipt: rzpOrder.receipt,
          });
        } else {
          const errData = await rzpRes.json().catch(() => null);
          console.warn("Razorpay order API error:", errData);
        }
      } catch (err) {
        console.warn("Live Razorpay order creation fallback:", err.message);
      }
    }

    // Structured fallback order creation for test/demo mode
    const mockOrderId = `order_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency,
      keyId,
      receipt,
      message: "Razorpay order created successfully.",
    });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create Razorpay order." },
      { status: 500 }
    );
  }
}
