import { requireStaff } from "@/lib/auth";
import { CouponEditor } from "../CouponEditor";

export const metadata = { title: "Create Coupon" };

export default async function Page() {
  await requireStaff(["admin"]);
  return <CouponEditor />;
}
