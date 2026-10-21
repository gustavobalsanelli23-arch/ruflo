import { useEffect, useState } from 'react';
import { business, feed, links, profile } from '../data/site';
import { ArrowUpRight, InstagramIcon } from './ui/Icons';
import { Logo } from './ui/Logo';
import { Picture } from './ui/Picture';
import { Reveal, RevealLines } from './ui/Reveal';
import { SectionLabel } from './ui/SectionLabel';

type LivePost = { id: string; image: string; permalink: string; caption: string; isVideo: boolean };

/**
 * Por padrão mostra as publicações do perfil copiadas no build (sem prometer atualização).
 * Se a função /api/instagram estiver configurada com o token oficial, troca pelas mais recentes.
 */
function useLivePosts() {
  const [posts, setPosts] = useState<LivePost[] | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const ctrl = new AbortController();
    fetch('/api/instagram', { signal: ctrl.signal })
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((d: { posts?: LivePost[] } | null) => d?.posts?.length && setPosts(d.posts))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  return posts;
}

export function InstagramFeed() {
  const live = useLivePosts();

  return (
    <section id="instagram" aria-labelledby="instagram-title" className="concrete relative overflow-hidden py-20 md:py-32">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="min-w-0 lg:col-span-7">
            <SectionLabel index="05">Instagram</SectionLabel>
            <h2 id="instagram-title" className="poster mt-6 break-words text-[clamp(3rem,9.5vw,8.5rem)] text-chalk">
              <RevealLines lines={['Acompanhe', <span className="poster-outline">no feed.</span>]} />
            </h2>
          </div>

          {/* Cartão do perfil */}
          <Reveal delay={0.1} className="min-w-0 lg:col-span-5">
            <a
              href={links.instagram}
              target="_blank"
              rel="noopener"
              className="group flex items-center gap-5 border-2 border-chalk/20 p-5 transition-colors duration-300 hover:border-chalk md:p-6"
            >
              <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-chalk bg-ink p-2 md:size-24">
                <Logo decorative className="h-auto w-full" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="poster block text-3xl text-chalk md:text-4xl">{profile.displayName}</span>
                <span className="mt-1 block font-semibold text-paper">@{business.instagramHandle}</span>
                <span className="mt-1 block text-pretty text-sm text-smoke">{profile.tagline}</span>
              </span>
              <ArrowUpRight className="size-6 shrink-0 text-chalk transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
            </a>
          </Reveal>
        </div>

        {live ? (
          <ul className="mt-12 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
            {live.map((p) => (
              <li key={p.id}>
                <a href={p.permalink} target="_blank" rel="noopener" className="group grain block overflow-hidden" aria-label={`Abrir publicação no Instagram${p.caption ? `: ${p.caption}` : ''}`}>
                  <img src={p.image} alt="" loading="lazy" decoding="async" className="photo-bw aspect-square w-full object-cover group-hover:scale-[1.04]" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          feed.length > 0 && (
            <ul className="mt-12 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
              {feed.map((item, i) => (
                <Reveal as="li" key={item.name} delay={(i % 4) * 0.05}>
                  <a
                    href={item.permalink ?? links.instagram}
                    target="_blank"
                    rel="noopener"
                    className="group grain relative block overflow-hidden"
                    aria-label={`Ver no Instagram: ${item.alt}`}
                  >
                    <Picture image={item} sizes="(min-width: 768px) 32vw, 50vw" className="photo-bw aspect-square h-auto w-full object-cover group-hover:scale-[1.04]" />
                    <span className="absolute inset-0 grid place-items-center bg-ink/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <InstagramIcon className="size-8 text-chalk" />
                    </span>
                  </a>
                </Reveal>
              ))}
            </ul>
          )
        )}

        <Reveal delay={0.1} className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a href={links.instagram} target="_blank" rel="noopener" className="btn btn-chalk">
            <InstagramIcon className="size-5" />
            Seguir @{business.instagramHandle}
            <ArrowUpRight className="btn-arrow size-4" />
          </a>
          <p className="tag text-smoke">{live ? 'Publicações mais recentes do perfil' : 'Publicações do perfil oficial'}</p>
        </Reveal>
      </div>
    </section>
  );
}
