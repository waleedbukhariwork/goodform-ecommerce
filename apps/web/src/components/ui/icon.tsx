import type { SVGProps } from "react";

type Name =
  | "arrow-left"
  | "arrow-right"
  | "bag"
  | "orders"
  | "user"
  | "search"
  | "hanger"
  | "check"
  | "close";

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: Name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      aria-hidden="true"
      className="icon"
      viewBox="0 0 24 24"
      {...common}
      {...props}
    >
      {name === "arrow-left" && (
        <>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </>
      )}
      {name === "arrow-right" && (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      )}
      {name === "bag" && (
        <>
          <path d="M4 8h16l-1 12H5L4 8Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </>
      )}
      {name === "orders" && (
        <>
          <path d="M8 7h8" />
          <path d="M8 12h8" />
          <path d="M8 17h5" />
          <path d="M6 4h12v16H6z" />
        </>
      )}
      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </>
      )}
      {name === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="m15 15 5 5" />
        </>
      )}
      {name === "hanger" && (
        <>
          <path d="M12 6.5a1.5 1.5 0 1 0-1.2-2.4" />
          <path d="M12 6.5 5 11h14L12 6.5Z" />
          <path d="M7 11.5 12 20l5-8.5" />
        </>
      )}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "close" && (
        <>
          <path d="M5 5 19 19" />
          <path d="M19 5 5 19" />
        </>
      )}
    </svg>
  );
}
