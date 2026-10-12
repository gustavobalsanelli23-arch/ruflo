import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { About } from './components/About';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { Gallery } from './components/Gallery';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Locations } from './components/Locations';
import { MobileBookingBar } from './components/MobileBookingBar';
import { Services } from './components/Services';
import { Team } from './components/Team';
import { Testimonials } from './components/Testimonials';

export function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">
          <Hero />
          <About />
          <Services />
          <Gallery />
          <Team />
          <Testimonials />
          <Locations />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
        <MobileBookingBar />
      </MotionConfig>
    </LazyMotion>
  );
}
