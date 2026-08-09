import { ClosingCta } from "../components/landing/ClosingCta";
import { EventMarquee } from "../components/landing/EventMarquee";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingNav } from "../components/landing/LandingNav";
import { LenisRoot } from "../components/landing/LenisRoot";
import { MultiplayerStack } from "../components/landing/MultiplayerStack";
import { ProblemImpactSolution } from "../components/landing/ProblemImpactSolution";
import { ProductShowcase } from "../components/landing/ProductShowcase";

export function LandingPage() {
  return (
    <LenisRoot>
      <div className="landing-page relative min-h-[100dvh] bg-[var(--color-ink)] text-[var(--color-text)]">
        <LandingNav />
        <LandingHero />
        <EventMarquee />
        <ProblemImpactSolution />
        <ProductShowcase />
        <MultiplayerStack />
        <ClosingCta />
        <LandingFooter />
      </div>
    </LenisRoot>
  );
}
