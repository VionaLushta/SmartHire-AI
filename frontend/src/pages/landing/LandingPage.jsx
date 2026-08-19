import HeroSection from './components/HeroSection';
import TrustedCompaniesSection from './components/TrustedCompaniesSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import StatsSection from './components/StatsSection';
import WhySmartHireSection from './components/WhySmartHireSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import FaqSection from './components/FaqSection';
import FinalCtaSection from './components/FinalCtaSection';

export default function LandingPage() {
  return (
    <div className="w-full overflow-hidden">
      <HeroSection />
      <TrustedCompaniesSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <WhySmartHireSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  );
}
