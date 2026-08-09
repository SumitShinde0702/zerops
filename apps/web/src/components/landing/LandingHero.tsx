import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { DesertVideoBackground } from "./DesertVideoBackground";
import { HeroCanvas } from "./HeroCanvas";

export function LandingHero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section ref={sectionRef} className="relative isolate min-h-[100dvh] overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={reduce ? undefined : { y: videoY, scale: videoScale }}
      >
        <DesertVideoBackground />
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1400px] grid-cols-1 items-end gap-8 px-5 pb-16 pt-24 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center md:gap-10 md:px-8 md:pb-20 md:pt-20"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <div className="max-w-xl">
          <motion.p
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.22em] text-white/65"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Multiplayer agents
          </motion.p>

          <motion.h1
            className="mt-4 text-[clamp(3.4rem,9vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-white drop-shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            Room
          </motion.h1>

          <motion.p
            className="mt-5 max-w-[34ch] text-base leading-relaxed text-white/75 md:text-lg"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            Google Docs for agents. Join one live run, watch tools stream, then steer mid-flight.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to="/app"
              className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_40px_rgba(94,106,210,0.35)] transition hover:bg-[var(--color-accent-2)] active:scale-[0.98]"
            >
              Open demo
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/10 active:scale-[0.98]"
            >
              How Zerops
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="relative h-[48vh] w-full md:h-[min(70vh,640px)]"
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroCanvas />
        </motion.div>
      </motion.div>
    </section>
  );
}
