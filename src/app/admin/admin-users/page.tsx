import { redirect } from "next/navigation";

/** Staff accounts moved into Users. Kept so old links still work. */
export default function AdminUsers() {
  redirect("/admin/users");
}
