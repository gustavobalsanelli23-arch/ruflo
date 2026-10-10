import { Hero, heroLockers } from '@/components/home/Hero';
import { HomeSections } from '@/components/home/HomeSections';

export default function HomePage() {
  // A fileira do hero é resolvida no servidor (a foto do primeiro armário é o LCP);
  // as seções abaixo evitam repetir essas camisas.
  const lockers = heroLockers();
  return (
    <>
      <Hero lockers={lockers} />
      <HomeSections heroIds={lockers.map((p) => p.id)} />
    </>
  );
}
