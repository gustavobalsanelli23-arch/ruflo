import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { CreativeDirector } from './components/CreativeDirector';
import { Experience } from './components/Experience';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { Gallery } from './components/Gallery';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MobileBookingBar } from './components/MobileBookingBar';
import { Services } from './components/Services';
import { ServicesMarquee } from './components/ServicesMarquee';
import { Testimonials } from './components/Testimonials';

export function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-bone focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">
          <Hero />
          <ServicesMarquee />
          <About />
          <Services />
          <CreativeDirector />
          <Experience />
          <Gallery />
          <Testimonials />
          <FAQ />
          <Contact />
          <FinalCTA />
        </main>
        <Footer />
        <MobileBookingBar />
      </MotionConfig>
    </LazyMotion>
  );
}
