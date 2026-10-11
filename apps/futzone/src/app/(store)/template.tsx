/** Transição entre páginas da loja: só opacidade, 200ms (elementos fixos das páginas seguem presos à tela). */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
