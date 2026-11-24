import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  BabyBottleIcon, BandageIcon, CandyIcon, CigaretteIcon, DentalToothIcon, DropletIcon, Dumbbell01Icon, FirstAidKitIcon,
  HealthIcon, MaskIcon, Medicine02Icon, MilkBottleIcon, PerfumeIcon, PillsTabletIcon, ShampooIcon, SoapDispenserDropletIcon,
  StethoscopeIcon, KidneysIcon, LollipopIcon, TabletsIcon,
} from "@hugeicons/core-free-icons";

/** Icon for each top-level category (by slug); anything unknown falls back to a keyword match, then a pill. */
const BY_SLUG: Record<string, IconSvgElement> = {
  "analgesics-pain-reliever": PillsTabletIcon,
  dental: DentalToothIcon,
  "baby-and-mum": BabyBottleIcon,
  "personal-care": SoapDispenserDropletIcon,
  "multi-vitamins": TabletsIcon,
  "medical-diagnostic": StethoscopeIcon,
  "first-aid": FirstAidKitIcon,
  "digestive-health": KidneysIcon,
  "cough-and-cold": MaskIcon,
  "smoking-cessation": CigaretteIcon,
  formulas: MilkBottleIcon,
  "skin-care": ShampooIcon,
  oils: DropletIcon,
  lozegens: LollipopIcon,
  "sporting-supplements": Dumbbell01Icon,
  confectionery: CandyIcon,
  fragrance: PerfumeIcon,
};

const KEYWORDS: [RegExp, IconSvgElement][] = [
  [/baby|mum|infant/i, BabyBottleIcon],
  [/vitamin|supplement/i, TabletsIcon],
  [/skin|hair|beauty/i, ShampooIcon],
  [/first aid|wound|bandage/i, BandageIcon],
  [/diagnos|device|test/i, StethoscopeIcon],
  [/medicine|pharma|drug/i, Medicine02Icon],
];

export function categoryIcon(slug: string, name = ""): IconSvgElement {
  return BY_SLUG[slug] ?? KEYWORDS.find(([re]) => re.test(name))?.[1] ?? HealthIcon;
}

/** Round mint badge with the category's icon, as in the reference "Explore All Categories" menu. */
export function CategoryIcon({ slug, name, size = 40, className = "" }: { slug: string; name?: string; size?: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <HugeiconsIcon icon={categoryIcon(slug, name)} size={Math.round(size * 0.55)} strokeWidth={1.6} />
    </span>
  );
}
