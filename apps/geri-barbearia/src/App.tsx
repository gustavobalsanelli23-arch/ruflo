import { useEffect } from 'react';
import { About } from './components/About';
import { MobileCta, PoleProgress } from './components/Chrome';
import { Footer } from './components/Footer';
import { Gallery } from './components/Gallery';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Intro } from './components/Intro';
import { Motto } from './components/Motto';
import { Services } from './components/Services';
import { Visit } from './components/Visit';
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
      <Intro />
      <Header />
      <main id="conteudo">
        <Hero />
        <About />
        <Services />
        <Gallery />
        <Motto />
        <Visit />
      </main>
      <Footer />
      <MobileCta />
      <PoleProgress />
    </>
  );
}
