import HeroSection from './components/HeroSection';
import TrustedCompaniesSection from './components/TrustedCompaniesSection';
import FeaturesSection from './components/FeaturesSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import FinalCtaSection from './components/FinalCtaSection';

export default function LandingPage() {
  return (
    <div className="w-full overflow-hidden">
      <HeroSection />
      <TrustedCompaniesSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCtaSection />
    </div>
  );
}
