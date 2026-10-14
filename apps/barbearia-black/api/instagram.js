// Função serverless (Vercel) que entrega as publicações mais recentes do perfil
// pela API oficial do Instagram (Instagram API com login do Instagram).
//
// Fica desligada até existir um token: configure IG_ACCESS_TOKEN nas variáveis
// de ambiente do projeto (token de longa duração da conta @theus_barbeiro_, que
// precisa ser profissional). Sem token, responde 204 e o site mostra as fotos
// publicadas no momento do build, sem fingir atualização automática.
//
// O token de longa duração vale 60 dias; renove em
// https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=TOKEN

const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

export async function GET() {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) return new Response(null, { status: 204 });

  const url = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=12&access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return new Response(null, { status: 204 });
    const { data = [] } = await res.json();
    const posts = data
      .filter((p) => p.media_type === 'IMAGE' || p.media_type === 'CAROUSEL_ALBUM' || p.media_type === 'VIDEO')
      .map((p) => ({
        id: p.id,
        image: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
        permalink: p.permalink,
        caption: (p.caption ?? '').slice(0, 220),
        isVideo: p.media_type === 'VIDEO',
        timestamp: p.timestamp,
      }))
      .filter((p) => p.image && p.permalink)
      .slice(0, 8);
    return Response.json(
      { posts },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch {
    return new Response(null, { status: 204 });
  }
}
