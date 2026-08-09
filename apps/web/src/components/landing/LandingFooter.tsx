import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] px-5 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>Deployed on Zerops for the WeMakeDevs challenge.</p>
        <div className="flex gap-5">
          <Link to="/app" className="transition hover:text-[var(--color-text)]">
            Open demo
          </Link>
          <Link to="/about" className="transition hover:text-[var(--color-text)]">
            How Zerops
          </Link>
        </div>
      </div>
    </footer>
  );
}
