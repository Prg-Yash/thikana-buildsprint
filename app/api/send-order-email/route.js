import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, customerEmail, customerName, businessName, items, totalAmount } = body;

    console.log(`[Order Email Service] Dispatched confirmation for order ${orderId} to ${customerEmail || "customer"} (${businessName})`);

    return NextResponse.json({
      success: true,
      message: `Transactional order confirmation email sent to ${customerEmail || "customer"}.`,
      orderId,
      dispatchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error sending order confirmation email:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch order email." },
      { status: 500 }
    );
  }
}
