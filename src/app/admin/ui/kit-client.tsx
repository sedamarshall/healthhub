"use client";

import { confirmDialog, toneFor } from "@/components/ConfirmDialog";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { IImagePlus } from "./icons";

/** Pill filter select that submits its form when changed. */
export function AutoSubmitSelect({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <select
      name={name}
      defaultValue={value}
      aria-label={label}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="h-9 min-w-[140px] cursor-pointer appearance-none rounded-full bg-[#f4f6f8] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23212529%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat py-2 pl-3 pr-9 text-sm text-[#212529] outline-none focus:ring-2 focus:ring-[#a10fe4]"
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function ConfirmIconButton({ confirm, label, className, children }: { confirm?: string; label: string; className: string; children: React.ReactNode }) {
  return (
    <button
      // With a confirmation, the button never submits by itself: a click before the page is
      // interactive does nothing, so a destructive action can't skip the dialog.
      type={confirm ? "button" : "submit"}
      title={label}
      aria-label={label}
      className={className}
      onClick={async (e) => {
        if (!confirm) return;
        e.preventDefault();
        const button = e.currentTarget;
        const ok = await confirmDialog({ title: `${label}?`, message: confirm, confirmLabel: (() => { const s = label.split(" (")[0]; return s.length <= 18 ? s : s.split(" ")[0]; })(), tone: toneFor(label) });
        if (ok) button.form?.requestSubmit();
      }}
    >
      {children}
    </button>
  );
}

/** "Upload Cover photo"-style box. Shows file previews; the input is submitted with the form. */
export function UploadBox({ name, title, hint = "Allowed *.jpeg, *.jpg, *.png, *.webp · Max 5 MB", multiple, accept = "image/jpeg,image/png,image/webp,image/avif" }: { name: string; title: string; hint?: string; multiple?: boolean; accept?: string }) {
  const [previews, setPreviews] = useState<string[]>([]);
  return (
    <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-[rgba(145,158,171,0.2)] p-6 text-center hover:bg-[#f9fafb]">
      {previews.length ? (
        <span className="flex flex-wrap justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previews.map((p) => <img key={p} src={p} alt="" className="h-16 w-16 rounded-lg object-contain" />)}
        </span>
      ) : (
        <IImagePlus className="h-7 w-7 text-[#212529]" />
      )}
      <span className="text-sm font-medium text-[#212529]">{title}</span>
      <span className="max-w-[320px] text-xs text-[#919eab]">{hint}</span>
      <input
        type="file"
        name={name}
        multiple={multiple}
        accept={accept}
        className="sr-only"
        onChange={(e) => setPreviews([...(e.target.files ?? [])].map((f) => URL.createObjectURL(f)))}
      />
    </label>
  );
}

export type FormState = { error?: string; ok?: string };

/** Wraps a form bound to a server action that returns {error, ok}; shows the message at the top. */
export function ActionForm({ action, children, className = "space-y-4 sm:space-y-6" }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; children: React.ReactNode; className?: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error && <p className="rounded-xl bg-[rgba(255,72,66,0.12)] px-4 py-3 text-sm text-[#b71d18]" role="alert">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-[rgba(0,171,85,0.12)] px-4 py-3 text-sm text-[#850cbd]" role="status">{state.ok}</p>}
      {children}
    </form>
  );
}

/** Cancel + Save buttons (Save shows progress while the form submits). */
export function SaveButtons({ cancel, saveLabel = "Save" }: { cancel?: string; saveLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end gap-2">
      {cancel && <Link href={cancel} className="inline-flex h-9 items-center rounded-full px-4 text-sm font-bold text-[#212529] shadow-[0_0_0_1px_rgba(145,158,171,0.32)] hover:bg-[#f9fafb]">Cancel</Link>}
      <button disabled={pending} className="inline-flex h-9 items-center rounded-full bg-[#a10fe4] px-4 text-sm font-bold text-white hover:bg-[#850cbd] disabled:opacity-60">{pending ? "Saving…" : saveLabel}</button>
    </div>
  );
}
