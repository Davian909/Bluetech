export function BluetechLogo({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const strokes =
    variant === "light"
      ? { a: "#7eddc5", b: "#79bcdb", c: "#a3e4cf" }
      : { a: "#147d67", b: "#146795", c: "#3cb899" };
  return (
    <svg viewBox="0 0 96 40" className={className} aria-hidden="true" fill="none">
      <path
        d="M4 30 C 18 12, 30 12, 44 22 C 58 32, 72 32, 90 14"
        stroke={strokes.a}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M8 22 C 20 8, 32 10, 46 18 C 60 26, 72 24, 86 10"
        stroke={strokes.b}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M16 12 C 26 4, 36 6, 48 12 C 58 17, 68 15, 78 6"
        stroke={strokes.c}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
