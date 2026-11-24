"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewState } from "@/app/actions/reviews";
import { Field, FieldArea } from "./Field";

/** "Write a Review" box (reference layout: rating, comment, name, email, Cancel / Post Review). */
export function ReviewForm({ productId, name, email }: { productId: number; name?: string; email?: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);
  if (state.ok) return <p className="rounded-2xl bg-brand-50 p-4 text-[15px] text-brand-700">{state.ok}</p>;
  if (!open) {
    return (
      <div className="rounded-2xl border border-line p-6">
        <h4 className="font-heading text-xl font-bold">Write a Review</h4>
        <p className="mt-1 text-muted">Share your thoughts with other customers.</p>
        <button onClick={() => setOpen(true)} className="mt-4 h-11 rounded-full border border-line px-6 text-sm font-semibold hover:border-brand-600 hover:text-brand-600">Add Comment</button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line p-6">
      <h4 className="font-heading text-xl font-bold">Write a Review</h4>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="mb-2 font-semibold text-ink">Your review about this product:</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)}>
              <svg viewBox="0 0 24 24" className={`h-7 w-7 ${i <= rating ? "fill-[#ffab00]" : "fill-line"}`} aria-hidden="true"><path d="m12 2.8 2.8 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.1 20.1l1.5-6.4-4.9-4.3 6.5-.6z" /></svg>
            </button>
          ))}
        </div>
      </div>
      <FieldArea label="Comment *" name="comment" rows={4} required minLength={5} maxLength={1000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" name="name" required defaultValue={name} />
        <Field label="Email *" name="email" type="email" required defaultValue={email} />
      </div>
      {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-full border border-line px-6 text-sm font-semibold">Cancel</button>
        <button disabled={pending} className="h-11 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] disabled:opacity-60">{pending ? "Posting…" : "Post Review"}</button>
      </div>
    </form>
  );
}
