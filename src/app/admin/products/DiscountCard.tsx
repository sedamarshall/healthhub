"use client";

import { useState } from "react";
import { ICalendar } from "../ui/icons";

/** "1 Discount" card from the reference: a switch turns the discount on/off; off clears it when saved. */
export function DiscountCard({ price, startsAt, endsAt }: { price: number | ""; startsAt: string; endsAt: string }) {
  const [on, setOn] = useState(price !== "");
  const input = "peer block h-14 w-full appearance-none rounded-full border border-[rgba(145,158,171,0.2)] bg-white px-3.5 text-sm text-[#212529] focus:border-[#a10fe4] focus:outline-none disabled:opacity-50";
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-[#212529]">Discount</span>
          <span className="relative inline-flex">
            <input type="checkbox" name="discountOn" checked={on} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" />
            <span className="h-5 w-9 rounded-full bg-[#dfe3e8] transition peer-checked:bg-[#a10fe4]" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
          </span>
          <span className={`text-xs font-semibold ${on ? "text-[#a10fe4]" : "text-[#919eab]"}`}>{on ? "On" : "Off"}</span>
        </label>
      </div>
      <fieldset disabled={!on} className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <div className="relative">
          <input id="f-salePrice" name="salePrice" type="number" min={0} step={1} placeholder=" " defaultValue={price} required={on} className={`${input} pt-4`} />
          <label htmlFor="f-salePrice" className="pointer-events-none absolute left-3.5 top-0 -translate-y-1/2 bg-white px-1 text-xs text-[#a10fe4]">Discount Price (KES)</label>
        </div>
        {[
          ["saleStartsAt", "Starts", startsAt],
          ["saleEndsAt", "Ends", endsAt],
        ].map(([name, label, value]) => (
          <div key={name} className="relative">
            <ICalendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#637381]" />
            <input id={`f-${name}`} name={name} type="datetime-local" defaultValue={value} className={`${input} pl-12 pt-4`} />
            <label htmlFor={`f-${name}`} className="pointer-events-none absolute left-11 top-0 -translate-y-1/2 bg-white px-1 text-xs text-[#a10fe4]">Discount {label}</label>
          </div>
        ))}
      </fieldset>
      <p className="mt-3 text-xs text-[#919eab]">{on ? "Leave the dates empty for a discount that runs until you switch it off." : "Switch on to sell this product at a lower price for a while."}</p>
    </div>
  );
}
