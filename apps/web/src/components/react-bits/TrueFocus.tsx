import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils";

type TrueFocusProps = {
  sentence?: string;
  separator?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
  wordClassName?: string;
};

type FocusRect = { x: number; y: number; width: number; height: number };

/** React Bits: TrueFocus — https://reactbits.dev/text-animations/true-focus */
export function TrueFocus({
  sentence = "True Focus",
  separator = " ",
  manualMode = false,
  blurAmount = 5,
  borderColor = "#5e6ad2",
  glowColor = "rgba(94, 106, 210, 0.45)",
  animationDuration = 0.5,
  pauseBetweenAnimations = 1.1,
  className,
  wordClassName,
}: TrueFocusProps) {
  const words = sentence.split(separator);
  const reduce = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [focusRect, setFocusRect] = useState<FocusRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (manualMode || reduce) return;
    const interval = setInterval(
      () => setCurrentIndex((prev) => (prev + 1) % words.length),
      (animationDuration + pauseBetweenAnimations) * 1000,
    );
    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length, reduce]);

  useEffect(() => {
    if (reduce) return;
    if (!wordRefs.current[currentIndex] || !containerRef.current) return;
    const parentRect = containerRef.current.getBoundingClientRect();
    const activeRect = wordRefs.current[currentIndex]!.getBoundingClientRect();
    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height,
    });
  }, [currentIndex, words.length, reduce]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-wrap items-center justify-start gap-x-4 gap-y-2", className)}
    >
      {words.map((word, index) => {
        const isActive = reduce || index === currentIndex;
        return (
          <span
            key={`${word}-${index}`}
            ref={(el) => {
              wordRefs.current[index] = el;
            }}
            className={cn(
              "relative cursor-default text-3xl font-semibold tracking-tight md:text-5xl",
              wordClassName,
            )}
            style={
              {
                filter: isActive ? "blur(0px)" : `blur(${blurAmount}px)`,
                transition: `filter ${animationDuration}s ease`,
                userSelect: "none",
              } as CSSProperties
            }
            onMouseEnter={() => {
              if (manualMode) {
                setLastActiveIndex(index);
                setCurrentIndex(index);
              }
            }}
            onMouseLeave={() => {
              if (manualMode && lastActiveIndex !== null) {
                setCurrentIndex(lastActiveIndex);
              }
            }}
          >
            {word}
          </span>
        );
      })}

      {!reduce ? (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 box-border border-0"
          animate={{
            x: focusRect.x,
            y: focusRect.y,
            width: focusRect.width,
            height: focusRect.height,
            opacity: currentIndex >= 0 ? 1 : 0,
          }}
          transition={{ duration: animationDuration }}
          style={
            {
              "--border-color": borderColor,
              "--glow-color": glowColor,
            } as CSSProperties
          }
        >
          <span
            className="absolute left-[-8px] top-[-8px] h-3 w-3 rounded-[2px] border-[2px] border-b-0 border-r-0"
            style={{
              borderColor: "var(--border-color)",
              filter: "drop-shadow(0 0 4px var(--glow-color))",
            }}
          />
          <span
            className="absolute right-[-8px] top-[-8px] h-3 w-3 rounded-[2px] border-[2px] border-b-0 border-l-0"
            style={{
              borderColor: "var(--border-color)",
              filter: "drop-shadow(0 0 4px var(--glow-color))",
            }}
          />
          <span
            className="absolute bottom-[-8px] left-[-8px] h-3 w-3 rounded-[2px] border-[2px] border-r-0 border-t-0"
            style={{
              borderColor: "var(--border-color)",
              filter: "drop-shadow(0 0 4px var(--glow-color))",
            }}
          />
          <span
            className="absolute bottom-[-8px] right-[-8px] h-3 w-3 rounded-[2px] border-[2px] border-l-0 border-t-0"
            style={{
              borderColor: "var(--border-color)",
              filter: "drop-shadow(0 0 4px var(--glow-color))",
            }}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
