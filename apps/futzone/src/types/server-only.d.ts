// `server-only` é resolvido pelo próprio Next.js: importar este módulo em um
// componente de cliente quebra o build, impedindo vazamento de código do servidor.
declare module 'server-only';
