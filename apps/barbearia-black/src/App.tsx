import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { About } from './components/About';
import { Booking } from './components/Booking';
import { Footer } from './components/Footer';
import { Gallery } from './components/Gallery';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { InstagramFeed } from './components/InstagramFeed';
import { MobileBookingBar } from './components/MobileBookingBar';
import { Services } from './components/Services';

export function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-chalk focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">
          <Hero />
          <About />
          <Services />
          <Gallery />
          <Booking />
          <InstagramFeed />
        </main>
        <Footer />
        <MobileBookingBar />
      </MotionConfig>
    </LazyMotion>
  );
}
