import { useRef, useState, type MouseEventHandler, type ReactNode } from "react";
import { cn } from "../../lib/utils";

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`;
};

/** React Bits: SpotlightCard — https://reactbits.dev/components/spotlight-card */
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(94, 106, 210, 0.22)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (e) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={() => {
        setIsFocused(true);
        setOpacity(0.65);
      }}
      onBlur={() => {
        setIsFocused(false);
        setOpacity(0);
      }}
      onMouseEnter={() => setOpacity(0.65)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 md:p-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 72%)`,
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
