import { Category } from "@/lib/types";

// Minimal, consistent-stroke inline icons per category — keeps the front
// page scannable at a glance instead of relying on label text alone.
export default function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  // WCAG audit: every call site pairs this icon with a visible text label
  // (the category name) right next to it, so the icon itself carries no
  // information a screen reader needs to announce separately.
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": "true" as const,
  };

  switch (category) {
    case "switch":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="4" />
          <circle cx="8" cy="12" r="2.1" />
          <circle cx="16" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="16" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "gopro":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="12" rx="2.5" />
          <circle cx="12" cy="13" r="4" />
          <circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none" />
          <path d="M8 7V5.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5.5V7" />
        </svg>
      );
    case "dji":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.3" />
          <path d="M12 9.7 5.5 5M12 9.7 18.5 5M12 14.3 5.5 19M12 14.3 18.5 19" />
          <circle cx="5" cy="4.5" r="1.4" />
          <circle cx="19" cy="4.5" r="1.4" />
          <circle cx="5" cy="19.5" r="1.4" />
          <circle cx="19" cy="19.5" r="1.4" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <circle cx="12" cy="13" r="3.6" />
          <path d="M8 7l1.2-2h5.6L16 7" />
        </svg>
      );
    case "ps5":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="9" rx="4.5" />
          <path d="M8 10.5v4M6 12.5h4" />
          <circle cx="16" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="18" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "epson":
      return (
        <svg {...common}>
          <rect x="4" y="9" width="16" height="8" rx="1.5" />
          <path d="M7 9V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" />
          <rect x="7" y="14" width="10" height="6" />
        </svg>
      );
    case "xbox":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M7 7c2 2.5 3 4 5 4s3-1.5 5-4M6 18c2-3 4-5 6-5s4 2 6 5" />
        </svg>
      );
    case "steamdeck":
      return (
        <svg {...common}>
          <rect x="2.5" y="7" width="19" height="11" rx="4" />
          <circle cx="7.5" cy="12.5" r="1.8" />
          <circle cx="16.5" cy="12.5" r="1.8" />
        </svg>
      );
    case "quest":
      return (
        <svg {...common}>
          <rect x="2.5" y="8" width="19" height="9" rx="4" />
          <circle cx="8" cy="12.5" r="2" />
          <circle cx="16" cy="12.5" r="2" />
        </svg>
      );
    case "nas":
      return (
        <svg {...common}>
          <rect x="6" y="3" width="12" height="18" rx="1.5" />
          <path d="M8.5 7h7M8.5 12h7" />
          <circle cx="9" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "printer3d":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="5" rx="1" />
          <path d="M7 9v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9" />
          <path d="M9 15v4h6v-4" />
          <circle cx="12" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "projector":
      return (
        <svg {...common}>
          <rect x="2.5" y="8" width="13" height="8" rx="2" />
          <circle cx="9" cy="12" r="2.6" />
          <path d="M15.5 10.5 21 8.5v7l-5.5-2" />
        </svg>
      );
    case "rogally":
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="5" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="16.5" cy="10" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="14" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
