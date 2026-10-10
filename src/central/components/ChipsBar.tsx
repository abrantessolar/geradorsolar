/**
 * Barra de "Seu diagnóstico" — acumula rótulos curtos (chips) conforme o
 * usuário responde perguntas de maior sinal (consumo, prioridade,
 * empolgação). Puramente cosmético: não influencia roteamento nem score.
 * Oculta quando não há chips ainda, e o chamador a esconde em telas
 * terminais/lead (ver CentralEngine).
 */
export default function ChipsBar({ chips }: { chips: Record<string, string> }) {
  const valores = Object.values(chips);
  if (valores.length === 0) return null;

  return (
    <div className="ca-chips-bar">
      <h2>Seu diagnóstico</h2>
      <ul className="ca-chips">
        {valores.map((v, i) => (
          <li key={i} className="ca-chip">{v}</li>
        ))}
      </ul>
    </div>
  );
}
