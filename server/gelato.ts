// Gelato API — greeting card orders
const GELATO_API_KEY = process.env.GELATO_API_KEY;
const GELATO_BASE = "https://order.gelatoapis.com/v4";

export function isGelatoConfigured(): boolean {
  return !!GELATO_API_KEY;
}

export interface GelatoRecipient {
  firstName: string;
  lastName: string;
  addressLine1: string;
  city: string;
  state: string;
  postCode: string;
  country: string;
  email?: string;
}

async function gelatoFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${GELATO_BASE}${path}`, {
    ...options,
    headers: {
      "X-API-KEY": GELATO_API_KEY!,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gelato API error: ${JSON.stringify(data)}`);
  return data;
}

export async function createCardOrder(
  recipient: GelatoRecipient,
  frontImageUrl: string,
  insideMessage: string,
  occasion: string = "thinking-of-you",
  quantity: number = 1
): Promise<any> {
  const order = await gelatoFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      orderType: "order",
      orderReferenceId: `comm-card-${Date.now()}`,
      customerReferenceId: `${recipient.firstName}-${recipient.lastName}`,
      currency: "USD",
      items: [{
        itemReferenceId: `card-${Date.now()}`,
        productUid: "cards_pf_a5_pt_350-gsm-uncoated_cl_4-4_hor",
        quantity,
        files: [
          { type: "front", url: frontImageUrl },
          { type: "inside", url: `data:text/plain;base64,${Buffer.from(insideMessage).toString("base64")}` },
        ],
      }],
      shippingAddress: {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        addressLine1: recipient.addressLine1,
        city: recipient.city,
        state: recipient.state,
        postCode: recipient.postCode,
        country: recipient.country,
        email: recipient.email,
      },
    }),
  });

  return order;
}

export async function getOrderStatus(orderId: string): Promise<any> {
  return gelatoFetch(`/orders/${orderId}`);
}

// Wall calendar product UID for US letter size (11x8.5 folded, 11x17 open)
const CALENDAR_PRODUCT_UID = "wall-calendars_pf_lt_pt_100-lb-cover-coated-silk_cl_4-4_bt_wire-o-top_hor";

/**
 * Create a calendar order on Gelato
 * @param recipient - Shipping address
 * @param pdfUrl - URL of the print-ready PDF
 * @param pageCount - Number of pages (cover + months, e.g. 13 for full year)
 * @param calendarProjectId - Our internal project ID for reference
 */
export async function createCalendarOrder(
  recipient: GelatoRecipient,
  pdfUrl: string,
  pageCount: number = 26, // Gelato counts front+back per sheet
  calendarProjectId: number
): Promise<any> {
  const order = await gelatoFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      orderType: "order",
      orderReferenceId: `comm-cal-${calendarProjectId}-${Date.now()}`,
      customerReferenceId: `calendar-${calendarProjectId}`,
      currency: "USD",
      items: [{
        itemReferenceId: `cal-${calendarProjectId}`,
        productUid: CALENDAR_PRODUCT_UID,
        pageCount,
        quantity: 1,
        files: [
          { type: "default", url: pdfUrl },
        ],
      }],
      shippingAddress: {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        addressLine1: recipient.addressLine1,
        city: recipient.city,
        state: recipient.state,
        postCode: recipient.postCode,
        country: recipient.country,
        email: recipient.email,
      },
    }),
  });

  console.log(`[gelato] Calendar order created: ${order.id} for project ${calendarProjectId}`);
  return order;
}
