import { Link } from "react-router-dom";

export function LandingNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[11px] font-bold text-white">
            R
          </span>
          <span>Room</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            to="/about"
            className="hidden text-white/65 transition-colors hover:text-white sm:inline"
          >
            Zerops
          </Link>
          <Link
            to="/app"
            className="rounded-md border border-white/15 bg-white/8 px-3 py-1.5 text-white backdrop-blur-md transition hover:bg-white/14 active:scale-[0.98]"
          >
            Open demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
