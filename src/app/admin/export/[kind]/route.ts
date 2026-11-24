import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const csv = (rows: (string | number | null | undefined | Date)[][]) =>
  rows
    .map((r) =>
      r
        .map((v) => {
          const s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? "" : String(v);
          // neutralise spreadsheet formulas and quote everything
          const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");

/** CSV downloads behind every "Export" button in the admin. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const s = await getSession();
  if (!s || (s.role !== "admin" && !(s.role === "pharmacist" && ["orders", "transactions"].includes((await params).kind)))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { kind } = await params;
  const sp = req.nextUrl.searchParams;
  const days = Number(sp.get("days")) || 3650;
  const from = new Date(Date.now() - days * 86400000);
  let rows: (string | number | null | undefined | Date)[][] = [];

  switch (kind) {
    case "products": {
      const ps = await prisma.product.findMany({ orderBy: { id: "asc" }, include: { categories: { include: { category: true } } } });
      rows = [["id", "sku", "old_code", "name", "brand", "price", "sale_price", "stock_qty", "stock_status", "rx", "status", "categories"], ...ps.map((p) => [p.id, p.sku, p.legacyCode, p.name, p.brand, p.price, p.salePrice, p.stockQty, p.stockStatus, p.rxClass, p.status, p.categories.map((c) => c.category.name).join(" | ")])];
      break;
    }
    case "inventory": {
      const ps = await prisma.product.findMany({ where: { status: { not: "archived" } }, orderBy: { stockQty: "asc" } });
      rows = [["sku", "name", "stock_qty", "stock_status", "updated"], ...ps.map((p) => [p.sku, p.name, p.stockQty, p.stockStatus, p.updatedAt])];
      break;
    }
    case "orders": {
      const os = await prisma.order.findMany({ where: { ...(sp.get("status") ? { status: sp.get("status")! } : {}) }, orderBy: { createdAt: "desc" }, include: { items: true } });
      rows = [["number", "date", "customer", "phone", "email", "items", "subtotal", "discount", "delivery", "total", "payment", "status", "zone", "town"], ...os.map((o) => [o.number, o.createdAt, o.name, o.phone, o.email, o.items.reduce((a, i) => a + i.qty, 0), o.subtotal, o.discount, o.deliveryFee, o.total, o.paymentStatus, o.status, o.deliveryZone, o.town])];
      break;
    }
    case "sales": {
      const os = await prisma.order.findMany({ where: { paymentStatus: "paid", paidAt: { gte: from } }, orderBy: { paidAt: "desc" } });
      rows = [["number", "paid_at", "customer", "total", "delivery", "status"], ...os.map((o) => [o.number, o.paidAt, o.name, o.total, o.deliveryFee, o.status])];
      break;
    }
    case "refunds": {
      const rs = await prisma.refund.findMany({ orderBy: { createdAt: "desc" }, include: { order: true } });
      rows = [["id", "order", "amount", "method", "reason", "status", "reference", "created"], ...rs.map((r) => [r.id, r.order.number, r.amount, r.method, r.reason, r.status, r.reference, r.createdAt])];
      break;
    }
    case "transactions": {
      const ps = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, include: { order: true } });
      rows = [["date", "order", "method", "amount", "status", "receipt", "reference", "phone", "email"], ...ps.map((p) => [p.createdAt, p.order.number, p.provider, p.amount, p.status, p.receipt, p.reference, p.phone, p.order.email])];
      break;
    }
    case "carts": {
      const cs = await prisma.cart.findMany({ where: { items: { some: {} } }, include: { user: true, items: { include: { product: true } } }, orderBy: { updatedAt: "desc" } });
      rows = [["cart", "customer", "email", "items", "updated"], ...cs.map((c) => [c.id, c.user?.name ?? "Guest", c.user?.email, c.items.map((i) => `${i.qty}x ${i.product.name}`).join(" | "), c.updatedAt])];
      break;
    }
    case "admins":
    case "customers":
    case "users": {
      const us = await prisma.user.findMany({ where: kind === "admins" ? { role: { in: ["admin", "pharmacist"] } } : kind === "customers" ? { role: "customer" } : {}, orderBy: { createdAt: "desc" } });
      rows = [["id", "name", "email", "phone", "role", "active", "joined"], ...us.map((u) => [u.id, u.name, u.email, u.phone, u.role, u.isActive ? "yes" : "no", u.createdAt])];
      break;
    }
    case "coupons": {
      const cs = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
      rows = [["code", "title", "type", "value", "min_order", "used", "limit", "starts", "ends", "active"], ...cs.map((c) => [c.code, c.title, c.type, c.value, c.minOrder, c.used, c.usageLimit, c.startsAt, c.endsAt, c.isActive ? "yes" : "no"])];
      break;
    }
    case "flash-sales": {
      const fs = await prisma.flashSale.findMany({ include: { products: { select: { sku: true } } }, orderBy: { startsAt: "desc" } });
      rows = [["title", "discount_pct", "starts", "ends", "active", "skus"], ...fs.map((f) => [f.title, f.discountPct, f.startsAt, f.endsAt, f.isActive ? "yes" : "no", f.products.map((p) => p.sku).join(" ")])];
      break;
    }
    case "top-products": {
      const sold = await prisma.orderItem.groupBy({ by: ["productId", "name", "sku"], where: { order: { paymentStatus: "paid", paidAt: { gte: from } } }, _sum: { qty: true }, orderBy: { _sum: { qty: "desc" } } });
      rows = [["sku", "name", "units_sold"], ...sold.map((s) => [s.sku, s.name, s._sum.qty])];
      break;
    }
    default:
      return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse("﻿" + csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="healthhub-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
