import { requireStaff } from "@/lib/auth";
import { CouponEditor } from "../CouponEditor";

export const metadata = { title: "Edit Coupon" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  return <CouponEditor id={Number((await params).id)} />;
}
