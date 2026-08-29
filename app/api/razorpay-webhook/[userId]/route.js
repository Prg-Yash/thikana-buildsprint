import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req, { params }) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    const rawBody = await req.text();
    let body = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      // Body might be plain or empty for test ping
    }

    const signature = req.headers.get("x-razorpay-signature");

    // Handle Endpoint Test Ping
    if (body?.isTestPing || body?.event === "ping" || !signature) {
      return NextResponse.json({
        success: true,
        message: `Webhook endpoint verified successfully for user ${userId}`,
        receivedEvent: body?.event || "ping",
        timestamp: new Date().toISOString(),
      });
    }

    const event = body.event;
    const payload = body.payload;

    console.log(`Received Razorpay webhook event '${event}' for user ${userId}`);

    // Standard Razorpay events supported:
    // payment.authorized, payment.captured, payment.failed, order.paid, subscription.charged
    switch (event) {
      case "payment.authorized":
        // Process payment authorization
        break;
      case "payment.captured":
        // Process payment capture
        break;
      case "payment.failed":
        // Handle payment failure
        break;
      case "order.paid":
        // Process order completion
        break;
      case "subscription.charged":
        // Process subscription charge
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }

    return NextResponse.json({
      status: "ok",
      event,
      userId,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  const resolvedParams = await params;
  return NextResponse.json({
    status: "active",
    endpoint: `/api/razorpay-webhook/${resolvedParams.userId}`,
    message: "Razorpay Webhook Endpoint is healthy and listening for events.",
  });
}
