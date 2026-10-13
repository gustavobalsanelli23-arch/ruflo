import { address, business, hours, links, whatsapp } from '../data/site';
import { track } from '../lib/analytics';
import { BookingForm } from './BookingForm';
import { ArrowUpRight, Clock, Instagram, Mail, MapPin, Navigation, Phone, WhatsApp } from './ui/Icons';
import { Reveal } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';
import { WhatsAppLink } from './ui/WhatsAppLink';

export function Contact() {
  const rows = [
    {
      icon: MapPin,
      label: 'Endereço',
      content: (
        <a href={links.googleMaps} target="_blank" rel="noopener noreferrer" className="link-line" onClick={() => track('FindLocation')}>
          {address.street} — {address.district}
          <br />
          {address.city}/{address.state} · {address.postalCode}
        </a>
      ),
    },
    {
      icon: Clock,
      label: 'Horário',
      content: (
        <>
          {hours.summary}
          <br />
          <span className="text-stone">{hours.closed}</span>
        </>
      ),
    },
    {
      icon: WhatsApp,
      label: 'WhatsApp',
      content: (
        <WhatsAppLink source="contato" className="link-line">
          {whatsapp.display}
        </WhatsAppLink>
      ),
    },
    {
      icon: Phone,
      label: 'Telefone',
      content: (
        <a href={business.phone.href} className="link-line" onClick={() => track('Contact', { channel: 'telefone', source: 'contato' })}>
          {business.phone.display}
        </a>
      ),
    },
    {
      icon: Mail,
      label: 'E-mail',
      content: (
        <a href={`mailto:${business.email}`} className="link-line break-all">
          {business.email}
        </a>
      ),
    },
    {
      icon: Instagram,
      label: 'Instagram',
      content: (
        <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="link-line">
          {links.instagramHandle}
        </a>
      ),
    },
  ];

  return (
    <section id="contato" aria-labelledby="contato-titulo" className="bg-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeader
          id="contato-titulo"
          index="08"
          eyebrow="Localização & contato"
          title={[
            'Venha conhecer',
            <>
              o <em>VIP.</em>
            </>,
          ]}
          intro={<p>No Bethaville, em Barueri (SP). Entrada, banheiro e estacionamento acessíveis.</p>}
        />

        <div className="mt-16 grid grid-cols-1 gap-16 md:mt-24 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Reveal>
              <dl className="divide-y divide-ink/10 border-y border-ink/10">
                {rows.map(({ icon: Icon, label, content }) => (
                  <div key={label} className="grid grid-cols-[2rem_6.5rem_1fr] items-start gap-2 py-5 text-[0.95rem] sm:grid-cols-[2rem_8rem_1fr]">
                    <Icon width={18} height={18} className="mt-0.5 text-honey-deep" />
                    <dt className="eyebrow pt-1 text-[0.6rem] text-stone">{label}</dt>
                    <dd>{content}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
              <a
                href={links.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark min-h-11 px-5 text-[0.65rem]"
                onClick={() => track('FindLocation', { app: 'google-maps' })}
              >
                <Navigation width={16} height={16} /> Como chegar
              </a>
              <a
                href={links.waze}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark min-h-11 px-5 text-[0.65rem]"
                onClick={() => track('FindLocation', { app: 'waze' })}
              >
                Abrir no Waze <ArrowUpRight width={14} height={14} />
              </a>
            </Reveal>

            <Reveal delay={0.15} className="mt-10">
              <div className="relative aspect-[4/3] overflow-hidden bg-sand">
                <iframe
                  title={`Mapa: ${business.name} — ${address.full}`}
                  src={links.mapEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 h-full w-full border-0 grayscale-[0.85] contrast-[1.05] transition-[filter] duration-700 hover:grayscale-0"
                />
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal className="border border-ink/10 bg-bone/60 p-6 xs:p-8 md:p-12">
              <p className="eyebrow text-[0.6rem] text-stone">Agendamento</p>
              <h3 className="display mt-4 text-4xl md:text-5xl">
                Reserve seu <em>horário</em>
              </h3>
              <p className="mt-4 max-w-md text-stone">
                Preencha e envie pelo WhatsApp. A equipe responde confirmando o melhor horário para você.
              </p>
              <div className="mt-10">
                <BookingForm />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
