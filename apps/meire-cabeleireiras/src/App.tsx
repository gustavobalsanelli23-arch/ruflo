import { useEffect } from 'react';
import { About } from './components/About';
import { Booking } from './components/Booking';
import { Footer } from './components/Footer';
import { Gallery } from './components/Gallery';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { InstagramSection } from './components/InstagramSection';
import { MobileCta } from './components/MobileCta';
import { Specialties } from './components/Specialties';
import { ScrollTrigger, setupGsap, startSmoothScroll } from './lib/motion';

export function App() {
  useEffect(() => {
    setupGsap();
    ScrollTrigger.config({ ignoreMobileResize: true });
    startSmoothScroll();
    // Fontes e fotos mudam alturas: recalcula os gatilhos de rolagem.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh, { once: true });
    return () => window.removeEventListener('load', refresh);
  }, []);

  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <About />
        <Specialties />
        <Gallery />
        <Booking />
        <InstagramSection />
      </main>
      <Footer />
      <MobileCta />
    </>
  );
}
