// Printful API — order creation for framed prints, mugs, totes, iPhone cases
const PRINTFUL_API_TOKEN = process.env.PRINTFUL_API_TOKEN;
const PRINTFUL_BASE = "https://api.printful.com";

export function isPrintfulConfigured(): boolean {
  return !!PRINTFUL_API_TOKEN;
}

export interface PrintfulRecipient {
  name: string;
  address1: string;
  city: string;
  state_code: string;
  zip: string;
  country_code: string;
  email?: string;
  phone?: string;
}

export interface PrintfulItem {
  variant_id: number;
  quantity: number;
  files: Array<{ type: string; url: string }>;
  options?: Array<{ id: string; value: string }>;
}

async function printfulFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${PRINTFUL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Printful API error: ${data?.error?.message || res.statusText}`);
  return data;
}

export async function createOrder(recipient: PrintfulRecipient, items: PrintfulItem[], isDraft = false): Promise<any> {
  const body = {
    recipient,
    items,
    packing_slip: {
      email: "hello@pawtraitcommunities.com",
      phone: "",
      message: "Thank you for your Pawtrait Communities order!",
    },
  };

  const endpoint = isDraft ? "/orders" : "/orders?confirm=true";
  const data = await printfulFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
  return data.result;
}

export async function getOrderStatus(orderId: string): Promise<any> {
  const data = await printfulFetch(`/orders/${orderId}`);
  return data.result;
}

export async function getShippingRates(recipient: PrintfulRecipient, items: PrintfulItem[]): Promise<any> {
  const data = await printfulFetch("/shipping/rates", {
    method: "POST",
    body: JSON.stringify({ recipient, items }),
  });
  return data.result;
}
