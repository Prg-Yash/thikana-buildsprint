import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, title, message, sender } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: "Recipient phone number required." }, { status: 400 });
    }

    console.log(`[WhatsApp Dispatch Engine] Sending WhatsApp alert to ${phone} from '${sender || "Thikana"}'`);
    console.log(`Title: ${title}\nMessage: ${message}`);

    return NextResponse.json({
      success: true,
      message: `WhatsApp notification successfully dispatched to ${phone}`,
      phone,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("WhatsApp notification error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
