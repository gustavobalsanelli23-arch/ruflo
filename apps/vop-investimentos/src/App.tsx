import { LazyMotion, MotionConfig } from 'framer-motion';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { ScrollProgress } from './components/ScrollProgress';
import { AboutSection } from './sections/AboutSection';
import { ContactSection } from './sections/ContactSection';
import { FinalCtaSection } from './sections/FinalCtaSection';
import { HeroSection } from './sections/HeroSection';
import { IntroSection } from './sections/IntroSection';
import { InvestmentsSection } from './sections/InvestmentsSection';
import { LocationsSection } from './sections/LocationsSection';
import { PropertiesSection } from './sections/PropertiesSection';

// Recursos de animação num pedaço separado, baixado depois do HTML.
const loadFeatures = () => import('./lib/features').then((r) => r.default);

export function App() {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-linen focus:px-5 focus:py-3 focus:text-night"
        >
          Pular para o conteúdo
        </a>
        <ScrollProgress />
        <Navbar />
        <main id="conteudo">
          <HeroSection />
          <IntroSection />
          <PropertiesSection />
          <InvestmentsSection />
          <LocationsSection />
          <AboutSection />
          <FinalCtaSection />
          <ContactSection />
        </main>
        <Footer year={__BUILD_YEAR__} />
      </MotionConfig>
    </LazyMotion>
  );
}
