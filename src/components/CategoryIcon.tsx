import { Category } from "@/lib/types";

// Minimal, consistent-stroke inline icons per category — keeps the front
// page scannable at a glance instead of relying on label text alone.
export default function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
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
  }
}
