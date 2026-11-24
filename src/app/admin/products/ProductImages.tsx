import { deleteProductImage, makePrimaryImage } from "../actions";
import { Section } from "../ui/kit";

/** Current images with "make main" / delete (separate forms, outside the product form). */
export function ProductImages({ images }: { images: { id: number; url: string }[] }) {
  return (
    <Section title="Current Images">
      {images.length === 0 ? (
        <p className="text-sm text-[#919eab]">No images yet. Upload some in the Media section above.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {images.map((img, i) => (
            <div key={img.id} className={`w-32 rounded-2xl border p-2 ${i === 0 ? "border-[#a10fe4]" : "border-[rgba(145,158,171,0.2)]"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="aspect-square w-full rounded-xl bg-[#f9fafb] object-contain" />
              <div className="mt-2 flex justify-between text-xs font-semibold">
                {i === 0 ? (
                  <span className="text-[#a10fe4]">Main</span>
                ) : (
                  <form action={makePrimaryImage.bind(null, img.id)}><button className="text-[#a10fe4]">Make main</button></form>
                )}
                <form action={deleteProductImage.bind(null, img.id)}><button className="text-[#cb0233]">Delete</button></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
