import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Listing";
import { WishlistPage } from "@/components/Wishlist";

export const metadata: Metadata = { title: "My wishlist", robots: { index: false } };

export default function Wishlist() {
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Wishlist" }]} />
      <h1 className="section-title mb-6">My Wishlist</h1>
      <WishlistPage />
    </div>
  );
}
