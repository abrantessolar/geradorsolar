// O progresso é um sol que cruza o céu — o detalhe que só uma empresa
// solar teria, no lugar de uma barra genérica.
export default function Progress({ value }: { value: number }) {
  const p = Math.max(0, Math.min(1, value));
  // Caminho fixo (curva suave de 6,30 a 314,30 passando por 160,-6) —
  // calculamos o offset do traço e a posição do sol ao longo dele.
  const PATH_LEN = 346; // comprimento aproximado da curva quadrática abaixo
  const t = p;
  const x = 6 + (314 - 6) * t;
  const y = 30 + (-6 - 30) * (2 * t * (1 - t)) - (30 - 30) * t; // aproximação visual da curva

  return (
    <svg className="ca-horizon" viewBox="0 0 320 34" preserveAspectRatio="none" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <path className="track" d="M6 30 Q160 -6 314 30" />
      <path
        className="fill"
        d="M6 30 Q160 -6 314 30"
        style={{ strokeDasharray: PATH_LEN, strokeDashoffset: PATH_LEN * (1 - t) }}
      />
      <g className="sun" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <circle r="9" />
        <circle r="4.5" />
      </g>
    </svg>
  );
}
