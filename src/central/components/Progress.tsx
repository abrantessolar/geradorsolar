// Barra de progresso discreta. Como a árvore tem profundidades diferentes
// por caminho, é uma estimativa (etapas percorridas / estimativa do
// caminho) — o objetivo é dar sensação de avanço, não ser um contador exato.
export default function Progress({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(4, Math.round(value * 100)));
  return (
    <div className="h-1.5 w-full rounded-full bg-[#E3E8EF] overflow-hidden mb-6">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, background: '#F5A623' }}
      />
    </div>
  );
}
