import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import "lenis/dist/lenis.css";

export function LenisRoot({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;

    const lenis = new Lenis({
      // Cinematic inertia — longer ease-out, wheel feels heavy and smooth
      duration: 1.45,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.35,
      wheelMultiplier: 0.92,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      autoRaf: true,
    });

    document.documentElement.classList.add("lenis", "lenis-smooth");

    return () => {
      document.documentElement.classList.remove("lenis", "lenis-smooth");
      lenis.destroy();
    };
  }, [reduce]);

  return <>{children}</>;
}
