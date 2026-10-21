import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { Contact } from './components/Contact';
import { Experience } from './components/Experience';
import { FinalCTA } from './components/FinalCTA';
import { FloatingBooking } from './components/FloatingBooking';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Philosophy } from './components/Philosophy';
import { Results } from './components/Results';
import { Services } from './components/Services';

export function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-espresso focus:px-4 focus:py-3 focus:text-sm focus:text-ivory"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">
          <Hero />
          <Marquee />
          <Philosophy />
          <Services />
          <Results />
          <Experience />
          <FinalCTA />
          <Contact />
        </main>
        <Footer />
        <FloatingBooking />
      </MotionConfig>
    </LazyMotion>
  );
}
