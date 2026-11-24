// Outline icons for the admin (24px grid, 1.6 stroke)
type P = { className?: string };
const s = (className = "h-5 w-5") => ({
  className,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
});

export const IDashboard = ({ className }: P) => (
  <svg {...s(className)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
);
export const IBox = ({ className }: P) => (
  <svg {...s(className)}><path d="M4 7.5h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM3 4.5h18v3H3zM10 11h4" /></svg>
);
export const ICategory = ({ className }: P) => (
  <svg {...s(className)}><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><rect x="14" y="3.5" width="6.5" height="5" rx="1.2" /><rect x="14" y="15.5" width="6.5" height="5" rx="1.2" /><path d="M8.5 6H14M8.5 18H14M6 8.5v7" /></svg>
);
export const IInventory = ({ className }: P) => (
  <svg {...s(className)}><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 14h3" /></svg>
);
export const ICart = ({ className }: P) => (
  <svg {...s(className)}><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>
);
export const IRx = ({ className }: P) => (
  <svg {...s(className)}><path d="M6 20V4h5a4 4 0 0 1 0 8H6M10 12l8 8M18 14l-4 4" /></svg>
);
export const ITransaction = ({ className }: P) => (
  <svg {...s(className)}><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5M12 6.5V8M12 16v1.5" /></svg>
);
export const IUsers = ({ className }: P) => (
  <svg {...s(className)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></svg>
);
export const IAdmin = ({ className }: P) => (
  <svg {...s(className)}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20a6.5 6.5 0 0 1 9.6-5.7M17.5 13.5l3 1.2v2.4c0 1.8-1.3 3.2-3 3.9-1.7-.7-3-2.1-3-3.9v-2.4z" /></svg>
);
export const IChart = ({ className }: P) => (
  <svg {...s(className)}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>
);
export const IStore = ({ className }: P) => (
  <svg {...s(className)}><path d="M4 9.5V20h16V9.5M3 9.5 5 4h14l2 5.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0M10 20v-5h4v5" /></svg>
);
export const IChevronRight = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="m9 6 6 6-6 6" /></svg>
);
export const IChevronDown = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="m6 9 6 6 6-6" /></svg>
);
export const IChevronLeft = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="m15 6-6 6 6 6" /></svg>
);
export const ISearch = ({ className }: P) => (
  <svg {...s(className)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IMenu = ({ className }: P) => (
  <svg {...s(className)}><path d="M4 6h16M4 12h10M4 18h16" /></svg>
);
export const IBell = ({ className }: P) => (
  <svg {...s(className)}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></svg>
);
export const IChat = ({ className }: P) => (
  <svg {...s(className)}><path d="M4 18.5V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth={2.4} /></svg>
);
export const ILogout = ({ className }: P) => (
  <svg {...s(className)}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h10" /></svg>
);
export const ITrendUp = ({ className }: P) => (
  <svg {...s(className ?? "h-3.5 w-3.5")}><path d="m3 17 6-6 4 4 8-8M15 7h6v6" /></svg>
);
export const ITrendDown = ({ className }: P) => (
  <svg {...s(className ?? "h-3.5 w-3.5")}><path d="m3 7 6 6 4-4 8 8M15 17h6v-6" /></svg>
);
export const IEye = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IPencil = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>
);
export const ITrash = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const ICheck = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IX = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IBan = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></svg>
);
export const IImagePlus = ({ className }: P) => (
  <svg {...s(className ?? "h-7 w-7")}><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" /><path d="m4 16 4.5-4.5L13 16l2-2 5 5M17 3v6M14 6h6" /></svg>
);
export const IArrowLeft = ({ className }: P) => (
  <svg {...s(className ?? "h-5 w-5")}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const IPackage = ({ className }: P) => (
  <svg {...s(className ?? "h-6 w-6")}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5M8 5.2l8 4.6" /></svg>
);
export const ITruck = ({ className }: P) => (
  <svg {...s(className ?? "h-6 w-6")}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
);
export const IRefund = ({ className }: P) => (
  <svg {...s(className ?? "h-6 w-6")}><path d="M4 10a8 8 0 1 1 1.5 6M4 4v6h6" /><path d="M12 8v4l2.5 1.5" /></svg>
);
export const ITag = ({ className }: P) => (
  <svg {...s(className ?? "h-5 w-5")}><path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z" /><circle cx="8" cy="8" r="1.5" /></svg>
);
export const IBolt = ({ className }: P) => (
  <svg {...s(className ?? "h-5 w-5")}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg>
);
export const IDoc = ({ className }: P) => (
  <svg {...s(className ?? "h-5 w-5")}><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" /></svg>
);
export const IHelp = ({ className }: P) => (
  <svg {...s(className ?? "h-5 w-5")}><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7M12 17h.01" /></svg>
);
export const IShield = ({ className }: P) => (
  <svg {...s(className ?? "h-5 w-5")}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /></svg>
);
export const ISettings = ({ className }: P) => (
  <svg {...s(className ?? "h-5 w-5")}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const ICalendar = ({ className }: P) => (
  <svg {...s(className ?? "h-4 w-4")}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IUsersPlain = IUsers;
