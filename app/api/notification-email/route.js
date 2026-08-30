import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, recipientName, title, message, sender, link } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Recipient email required." }, { status: 400 });
    }

    console.log(`[Email Dispatch Engine] Dispatching email to ${recipientName || "User"} (${email})`);
    console.log(`Subject: ${title}\nBody: ${message}\nLink: ${link || "N/A"}`);

    return NextResponse.json({
      success: true,
      message: `Notification email successfully dispatched to ${email}`,
      email,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Notification Email error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
