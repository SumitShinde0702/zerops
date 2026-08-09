import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

const VIDEO_SRC = "/purple-desert/purple-desert.mp4";
const POSTER_SRC = "/purple-desert/purple-desert.jpg";

export function DesertVideoBackground() {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reduce) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const play = () => {
      void video.play().catch(() => {
        /* autoplay can be blocked; poster remains */
      });
    };

    if (video.readyState >= 2) play();
    else video.addEventListener("loadeddata", play, { once: true });

    return () => {
      video.pause();
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <img
        src={POSTER_SRC}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover"
        decoding="async"
        fetchPriority="high"
      />

      {!reduce ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full scale-105 object-cover"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : null}

      {/* Keep Room type readable over the purple desert loop */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(10,11,16,0.82)_0%,rgba(10,11,16,0.55)_42%,rgba(10,11,16,0.28)_68%,rgba(10,11,16,0.45)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,17,21,0.25)_0%,rgba(15,17,21,0.15)_45%,rgba(15,17,21,0.88)_100%)]" />
      <div className="miro-grid absolute inset-0 opacity-[0.22]" />
    </div>
  );
}
