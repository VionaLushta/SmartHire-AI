import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import FinalCtaSection from './components/FinalCtaSection';

export default function LandingPage() {
  return (
    <div className="w-full overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,255,0.96)_0%,rgba(243,247,255,0.92)_38%,rgba(255,255,255,1)_100%)]">
      <HeroSection />
      <FeaturesSection />
      <span id="pricing" className="sr-only" aria-hidden="true">
        pricing anchor
      </span>
      <FinalCtaSection />
    </div>
  );
}
