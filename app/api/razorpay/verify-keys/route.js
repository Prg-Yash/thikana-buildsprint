import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { keyId, keySecret, mode } = body;

    // Use server-side env variables as fallbacks if not explicitly passed
    keyId = keyId?.trim() || process.env.RAZORPAY_KEY_ID || "";
    keySecret = keySecret?.trim() || process.env.RAZORPAY_KEY_SECRET || "";
    mode = mode || (keyId.startsWith("rzp_live_") ? "live" : "test");

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key ID and Key Secret are required.",
        },
        { status: 400 }
      );
    }

    // Format check for Razorpay Key ID
    if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Razorpay Key ID format. Must start with 'rzp_test_' or 'rzp_live_'.",
        },
        { status: 400 }
      );
    }

    // Ping Razorpay API endpoint using Basic Auth to verify keys
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    
    // Perform fetch call to Razorpay
    const rzpRes = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (rzpRes.ok) {
      const data = await rzpRes.json();
      // Derive merchant account ID from response or generate structured identifier
      const accountId = data?.items?.[0]?.entity || `acc_${keyId.replace(/^rzp_(test|live)_/, "").slice(0, 10)}`;
      return NextResponse.json({
        success: true,
        message: "Razorpay credentials verified successfully!",
        keyId,
        mode,
        accountId: `acc_${keyId.substring(keyId.length - 8)}`,
      });
    }

    // Handle authentication error from Razorpay
    if (rzpRes.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed. Invalid Razorpay Key ID or Key Secret.",
        },
        { status: 401 }
      );
    }

    // Fallback error from Razorpay response
    const errorData = await rzpRes.json().catch(() => null);
    const errorMessage = errorData?.error?.description || "Failed to verify credentials with Razorpay.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: rzpRes.status || 400 }
    );
  } catch (err) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error during key verification.",
      },
      { status: 500 }
    );
  }
}
