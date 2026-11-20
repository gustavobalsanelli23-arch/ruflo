'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { NeuralNetwork, type NeuralNetworkHandle } from './neural-network';
import styles from './eclipse-analyst.module.css';

/**
 * What opens when the eclipse is clicked: the analyst, drawn as a nervous
 * system that grows out of the eclipse. On the public page it never calls
 * the AI (no account, no quota): the questions are examples answered with
 * the demo company's fictional figures, typed out while signals run through
 * the network, and the way on is the demo or a new account.
 */

const EXAMPLES = [
  {
    question: 'Como foram as vendas nos últimos 30 dias?',
    answer:
      'A receita foi de R$ 221,4 mil, 0,6% acima dos 30 dias anteriores. Os pedidos ficaram estáveis (3.718, −0,4%) e o ticket médio subiu para R$ 59,56 (+1,0%). A margem bruta ficou em 39,4%.',
  },
  {
    question: 'Onde estou perdendo dinheiro?',
    answer:
      'Há 3 oportunidades de alta prioridade que somam R$ 4.090 por mês. A maior é o reajuste de 9% da Laticínios Boa Vista: o custo de 5 itens subiu e o preço de venda deles não mudou.',
  },
  {
    question: 'O que faço primeiro?',
    answer:
      'Comece pela de maior impacto: renegociar o reajuste de 9% da Laticínios Boa Vista. Na demonstração, a oportunidade mostra o cálculo e as premissas por trás do valor.',
  },
];

export function EclipseAnalyst({ origin, onClose }: { origin: { x: number; y: number }; onClose: () => void }) {
  const network = useRef<NeuralNetworkHandle>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialog.current) return;
      // Keep focus inside the dialog.
      const focusable = dialog.current.querySelectorAll<HTMLElement>('button, a[href]');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClose]);

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ask = (index: number) => {
    setActive(index);
    // Reduced motion: the whole answer at once, no typing.
    setTyped(reducedMotion() ? EXAMPLES[index]!.answer : '');
    network.current?.fire();
  };

  useEffect(() => {
    if (active === null || reducedMotion()) return;
    const text = EXAMPLES[active]!.answer;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 2;
      setTyped(text.slice(0, index));
      if (index % 40 === 0) network.current?.fire();
      if (index >= text.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <div className={styles.overlay}>
      <NeuralNetwork ref={network} origin={origin} className={styles.network} />
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="analista-titulo" className={styles.panel}>
        <div className={styles.head}>
          <h2 id="analista-titulo" className={styles.title}>
            Analista de IA
          </h2>
          <button ref={closeButton} type="button" className={styles.close} onClick={onClose} aria-label="Fechar o analista">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <p className={styles.lede}>Pergunte em português. Aqui as respostas usam a empresa fictícia da demonstração.</p>

        <ul className={styles.questions}>
          {EXAMPLES.map((example, index) => (
            <li key={example.question}>
              <button
                type="button"
                className={styles.question}
                aria-pressed={active === index}
                onClick={() => ask(index)}
              >
                {example.question}
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.answer} aria-live="polite">
          {active === null ? (
            <p className={styles.placeholder}>Escolha uma pergunta.</p>
          ) : (
            <p>{typed}</p>
          )}
        </div>

        <div className={styles.actions}>
          <Link href="/demo/analista" className={`${styles.btn} ${styles.btnSolid}`}>
            Abrir na demonstração
          </Link>
          <Link href="/cadastro" className={`${styles.btn} ${styles.btnOutline}`}>
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
