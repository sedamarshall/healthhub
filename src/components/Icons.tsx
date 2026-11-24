type P = { className?: string };
const base = (className?: string) => ({
  className: className ?? "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
});

export const SearchIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const CartIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>
);
export const UserIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const MenuIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const GridIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
);
export const ChevronDown = ({ className }: P) => (
  <svg {...base(className ?? "h-4 w-4")}><path d="m6 9 6 6 6-6" /></svg>
);
export const ChevronRight = ({ className }: P) => (
  <svg {...base(className ?? "h-4 w-4")}><path d="m9 6 6 6-6 6" /></svg>
);
export const TruckIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
);
export const ShieldIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const RxIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 20V4h5a4 4 0 0 1 0 8H6M10 12l8 8M18 14l-4 4" /></svg>
);
export const PhoneIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18h2" /></svg>
);
export const HeadsetIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19c0 1.5-1.5 2.5-4 2.5h-2" /></svg>
);
export const HeartIcon = ({ className, filled }: P & { filled?: boolean }) => (
  <svg {...base(className)} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
);
export const ArrowUpRight = ({ className }: P) => (
  <svg {...base(className)}><path d="M7 17 17 7M8 7h9v9" /></svg>
);
export const MailIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
);
export const PinIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const HomeIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" /></svg>
);
export const ClockIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const ChevronLeft = ({ className }: P) => (
  <svg {...base(className ?? "h-4 w-4")}><path d="m15 6-6 6 6 6" /></svg>
);
export const WalletIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h2" /></svg>
);
