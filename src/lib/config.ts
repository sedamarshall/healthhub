export const STORE = {
  name: "Health Hub Chemist",
  phone: process.env.STORE_PHONE || "+254 704 191 509",
  email: "info@healthhub.ke",
  ppbLicence: process.env.PPB_LICENCE_NO || "",
  appUrl: process.env.APP_URL || "http://localhost:3000",
};

export const DELIVERY_SLOTS = ["08:00 AM – 11:00 AM", "11:00 AM – 02:00 PM", "02:00 PM – 04:00 PM", "04:00 PM – 06:00 PM"];
export const ADDRESS_TYPES = ["Home Address", "Office Address", "Others"];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_rx: "Awaiting pharmacist review",
  pending_payment: "Awaiting payment",
  processing: "Processing",
  paid: "Processing", // older orders saved before paid orders moved straight to Processing
  shipped: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Customer-facing label, with pickup wording for store-collection orders. */
export function orderStatusLabel(status: string, pickup = false): string {
  if (pickup && status === "shipped") return "Ready for pickup";
  if (pickup && status === "delivered") return "Collected";
  return ORDER_STATUS_LABEL[status] ?? status;
}

/** The order of steps a customer sees. */
export function orderSteps(needsRx: boolean): string[] {
  return needsRx ? ["awaiting_rx", "pending_payment", "processing", "shipped", "delivered"] : ["pending_payment", "processing", "shipped", "delivered"];
}
