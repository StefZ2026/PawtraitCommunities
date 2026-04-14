// Telnyx SMS — send notifications to residents
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_PHONE = process.env.TELNYX_PHONE_NUMBER || "+14709180008";

export function isSmsConfigured(): boolean {
  return !!TELNYX_API_KEY;
}

export async function sendSms(to: string, body: string, mediaUrl?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!TELNYX_API_KEY) return { success: false, error: "SMS not configured" };

  try {
    const payload: any = {
      from: TELNYX_PHONE,
      to,
      text: body,
      messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
    };

    if (mediaUrl) {
      payload.media_urls = [mediaUrl];
    }

    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || "SMS send failed";
      console.error("[sms] Telnyx error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: true, messageId: data?.data?.id };
  } catch (err: any) {
    console.error("[sms] Error:", err.message);
    return { success: false, error: err.message };
  }
}

// Send portrait-ready notification to a resident
export async function notifyPortraitReady(phone: string, petName: string, communityName: string, portraitUrl?: string): Promise<void> {
  const body = `${petName}'s AI portrait is ready! Check it out in the ${communityName} gallery at pawtraitcommunities.com`;
  await sendSms(phone, body, portraitUrl);
}
