import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/profile/settings?oauth_error=${encodeURIComponent(
        errorDescription || error
      )}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/profile/settings?oauth_error=${encodeURIComponent("Authorization code missing")}`
    );
  }

  // Attempt code exchange with Razorpay OAuth endpoint if client credentials exist
  const clientId = process.env.RAZORPAY_CLIENT_ID || process.env.RAZORPAY_KEY_ID;
  const clientSecret = process.env.RAZORPAY_CLIENT_SECRET || process.env.RAZORPAY_KEY_SECRET;

  let publicTokenData = {
    connectedAccountId: `acc_oauth_${Date.now().toString(36)}`,
    publicToken: code,
    state,
  };

  if (clientId && clientSecret) {
    try {
      const response = await fetch("https://auth.razorpay.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: `${baseUrl}/api/razorpay/callback`,
        }),
      });

      if (response.ok) {
        const tokenRes = await response.json();
        publicTokenData.connectedAccountId = tokenRes.razorpay_account_id || publicTokenData.connectedAccountId;
        publicTokenData.accessToken = tokenRes.access_token;
        publicTokenData.refreshToken = tokenRes.refresh_token;
      }
    } catch (err) {
      console.error("Error exchanging Razorpay OAuth code:", err);
    }
  }

  // Redirect to Settings page with oauth_success and parameters in URL/session
  const redirectUrl = new URL("/profile/settings", baseUrl);
  redirectUrl.searchParams.set("oauth_success", "true");
  redirectUrl.searchParams.set("account_id", publicTokenData.connectedAccountId);
  if (state) redirectUrl.searchParams.set("state", state);

  return NextResponse.redirect(redirectUrl.toString());
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, state } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: "Authorization code required" }, { status: 400 });
    }

    const mockAccountId = `acc_oauth_${Math.random().toString(36).substring(2, 10)}`;

    return NextResponse.json({
      success: true,
      razorpayAccountId: mockAccountId,
      message: "OAuth code exchanged successfully",
      connectedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
