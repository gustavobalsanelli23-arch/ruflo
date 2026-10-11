/**
 * Troca entre as páginas da conta: só o conteúdo entra (opacidade e um leve
 * deslocamento, 250ms); a coluna de placas fica parada. O template da loja
 * não remonta entre as páginas da conta, por isso este existe.
 */
export default function AccountTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
