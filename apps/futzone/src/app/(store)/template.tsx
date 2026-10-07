/** Transição suave entre páginas da loja (opacity + leve deslocamento, 250ms). */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
