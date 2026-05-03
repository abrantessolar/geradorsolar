// Biblioteca de ícones SVG inline para prêmios da Câmara das Relíquias.
// Para usar: salve em `imagem_url` o valor `icon:<key>` (ex: "icon:robo-aspirador").
// O componente <PremioIcon /> detecta e renderiza o SVG correspondente.

import React from "react";

type IconDef = { label: string; render: (size: number) => React.ReactNode };

const Defs = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <defs>{children}</defs>
);

export const PREMIO_ICONS: Record<string, IconDef> = {
  "echo-dot": {
    label: "Echo Dot",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="ed"><radialGradient id="ed1" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#3A3A4A"/><stop offset="100%" stopColor="#111118"/></radialGradient></Defs>
        <ellipse cx="60" cy="78" rx="30" ry="8" fill="#111" stroke="#C17F24" strokeWidth="1" opacity="0.6"/>
        <rect x="30" y="35" width="60" height="44" rx="30" fill="url(#ed1)" stroke="#C17F24" strokeWidth="1.5"/>
        <ellipse cx="60" cy="35" rx="30" ry="8" fill="#2A2A3A" stroke="#C17F24" strokeWidth="1.5"/>
        <ellipse cx="60" cy="35" rx="22" ry="5" fill="#1A1A2A"/>
        <ellipse cx="60" cy="79" rx="30" ry="8" fill="#2A2A3A" stroke="#C17F24" strokeWidth="1.5"/>
        <ellipse cx="60" cy="74" rx="24" ry="6" fill="#00C2FF" opacity="0.35" stroke="#00C2FF" strokeWidth="1.5"/>
        <circle cx="60" cy="57" r="12" fill="#1A1A2A" stroke="#F5A623" strokeWidth="1"/>
        <text x="60" y="62" textAnchor="middle" fill="#00C2FF" fontSize="11" fontFamily="sans-serif" fontWeight="bold">a</text>
      </svg>
    ),
  },
  "limpeza-placas": {
    label: "Limpeza das Placas",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="lp"><radialGradient id="lp1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#F5A623"/><stop offset="100%" stopColor="#7A3F00"/></radialGradient></Defs>
        <line x1="60" y1="15" x2="60" y2="78" stroke="#C17F24" strokeWidth="5" strokeLinecap="round"/>
        <line x1="60" y1="15" x2="60" y2="78" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <ellipse cx="60" cy="88" rx="28" ry="12" fill="url(#lp1)" stroke="#F5A623" strokeWidth="2"/>
        {[36,42,48,54,60,66,72,78,84].map((x,i)=>(
          <line key={i} x1={x} y1={i===0||i===8?84:i===1||i===7?82:i===2||i===6?81:80} x2={x} y2="100" stroke="#C17F24" strokeWidth="2" strokeLinecap="round"/>
        ))}
        <path d="M 45 60 A 20 20 0 0 1 75 60" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
        <path d="M 40 50 A 28 28 0 0 1 80 50" fill="none" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        <circle cx="60" cy="78" r="5" fill="#F5A623" stroke="#1A0F00" strokeWidth="1"/>
      </svg>
    ),
  },
  "air-fryer": {
    label: "Air Fryer",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="af">
          <radialGradient id="af1" cx="50%" cy="30%" r="70%"><stop offset="0%" stopColor="#3A3A3A"/><stop offset="100%" stopColor="#111"/></radialGradient>
          <radialGradient id="af2" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#E8651A" stopOpacity="0.8"/><stop offset="100%" stopColor="#7A2000" stopOpacity="0.4"/></radialGradient>
        </Defs>
        <rect x="20" y="18" width="80" height="90" rx="10" fill="url(#af1)" stroke="#F5A623" strokeWidth="2"/>
        <rect x="24" y="18" width="72" height="28" rx="8" fill="#2A2A2A" stroke="#C17F24" strokeWidth="1"/>
        <rect x="28" y="22" width="64" height="18" rx="4" fill="#1A1A1A"/>
        <text x="60" y="33" textAnchor="middle" fill="#F5A623" fontSize="10" fontFamily="monospace" fontWeight="bold">200°</text>
        <rect x="24" y="48" width="72" height="56" rx="6" fill="#1A1A1A" stroke="#C17F24" strokeWidth="1"/>
        <rect x="30" y="54" width="60" height="44" rx="3" fill="url(#af2)"/>
        {[60,70,80].map((y,i)=>(<rect key={i} x="32" y={y} width="56" height="6" rx="2" fill="#C17F24" opacity={0.5-i*0.1}/>))}
        <rect x="45" y="104" width="30" height="5" rx="2" fill="#C17F24"/>
      </svg>
    ),
  },
  "smartwatch": {
    label: "Smartwatch",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="sw"><radialGradient id="sw1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#2A2A3A"/><stop offset="100%" stopColor="#0D0A00"/></radialGradient></Defs>
        <rect x="48" y="15" width="24" height="16" rx="4" fill="#C17F24" stroke="#F5A623" strokeWidth="1"/>
        <rect x="48" y="89" width="24" height="16" rx="4" fill="#C17F24" stroke="#F5A623" strokeWidth="1"/>
        <rect x="30" y="30" width="60" height="60" rx="14" fill="url(#sw1)" stroke="#F5A623" strokeWidth="2.5"/>
        <rect x="35" y="35" width="50" height="50" rx="10" fill="#0D0A00" stroke="#C17F24" strokeWidth="1"/>
        <line x1="60" y1="46" x2="60" y2="60" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
        <line x1="60" y1="60" x2="70" y2="54" stroke="#E8651A" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="60" cy="60" r="2.5" fill="#F5A623"/>
        <text x="60" y="74" textAnchor="middle" fill="#F5A623" fontSize="8" fontFamily="monospace">12:34</text>
      </svg>
    ),
  },
  "ar-12000": {
    label: "Ar-cond. 12.000 BTUs",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="ar1"><radialGradient id="ar1g" cx="50%" cy="30%" r="60%"><stop offset="0%" stopColor="#C0C8D0"/><stop offset="100%" stopColor="#5A6070"/></radialGradient></Defs>
        <rect x="15" y="35" width="90" height="38" rx="8" fill="url(#ar1g)" stroke="#F5A623" strokeWidth="2"/>
        <rect x="15" y="35" width="90" height="12" rx="8" fill="#C17F24" opacity="0.4"/>
        {[52,58,64].map((y,i)=>(<rect key={i} x="20" y={y} width="80" height="3" rx="1" fill="#F5A623" opacity={0.5-i*0.1}/>))}
        <circle cx="90" cy="42" r="5" fill="#00C2FF" opacity="0.8" stroke="#F5A623" strokeWidth="1"/>
        {[25,40,55].map((x,i)=>(<path key={i} d={`M ${x} 75 Q ${x+5} 85 ${x} 95`} fill="none" stroke="#00C2FF" strokeWidth="1.5" strokeLinecap="round" opacity={0.7-i*0.2}/>))}
        <text x="60" y="108" textAnchor="middle" fill="#F5A623" fontSize="9" fontFamily="sans-serif" fontWeight="bold">12.000 BTUs</text>
      </svg>
    ),
  },
  "ar-18000": {
    label: "Ar-cond. 18.000 BTUs",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="ar2"><radialGradient id="ar2g" cx="50%" cy="30%" r="60%"><stop offset="0%" stopColor="#C0C8D0"/><stop offset="100%" stopColor="#5A6070"/></radialGradient></Defs>
        <rect x="10" y="32" width="100" height="42" rx="8" fill="url(#ar2g)" stroke="#F5A623" strokeWidth="2.5"/>
        <rect x="10" y="32" width="100" height="13" rx="8" fill="#C17F24" opacity="0.4"/>
        {[50,57,64].map((y,i)=>(<rect key={i} x="16" y={y} width="88" height="3" rx="1" fill="#F5A623" opacity={0.5-i*0.1}/>))}
        <circle cx="95" cy="40" r="6" fill="#00C2FF" opacity="0.8" stroke="#F5A623" strokeWidth="1.5"/>
        {[20,38,56,74].map((x,i)=>(<path key={i} d={`M ${x} 76 Q ${x+6} 87 ${x} 98`} fill="none" stroke="#00C2FF" strokeWidth="2" strokeLinecap="round" opacity={0.8-i*0.15}/>))}
        <text x="60" y="112" textAnchor="middle" fill="#F5A623" fontSize="9" fontFamily="sans-serif" fontWeight="bold">18.000 BTUs</text>
      </svg>
    ),
  },
  "tv-55": {
    label: 'TV 55"',
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="tv"><radialGradient id="tvg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1A2A3A"/><stop offset="100%" stopColor="#050A10"/></radialGradient></Defs>
        <rect x="10" y="22" width="100" height="68" rx="6" fill="#2A2A2A" stroke="#F5A623" strokeWidth="2.5"/>
        <rect x="14" y="26" width="92" height="60" rx="4" fill="url(#tvg)"/>
        <circle cx="60" cy="56" r="16" fill="none" stroke="#F5A623" strokeWidth="1" opacity="0.4"/>
        <polygon points="54,49 54,63 70,56" fill="#F5A623" opacity="0.8"/>
        <rect x="46" y="90" width="28" height="5" rx="2" fill="#C17F24"/>
        <rect x="35" y="95" width="50" height="5" rx="3" fill="#C17F24" stroke="#F5A623" strokeWidth="0.5"/>
        <text x="60" y="108" textAnchor="middle" fill="#F5A623" fontSize="10" fontFamily="sans-serif" fontWeight="bold">55"</text>
      </svg>
    ),
  },
  "iphone-17": {
    label: "iPhone 17",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="ip">
          <radialGradient id="ip1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#3A3A4A"/><stop offset="100%" stopColor="#0D0A1A"/></radialGradient>
          <radialGradient id="ip2" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#E0E8FF"/><stop offset="60%" stopColor="#8090B0"/><stop offset="100%" stopColor="#303050"/></radialGradient>
        </Defs>
        <rect x="33" y="8" width="54" height="104" rx="14" fill="url(#ip2)" stroke="#F5A623" strokeWidth="2"/>
        <rect x="36" y="11" width="48" height="98" rx="12" fill="url(#ip1)"/>
        <rect x="39" y="18" width="42" height="84" rx="6" fill="#080810"/>
        <rect x="48" y="10" width="24" height="6" rx="3" fill="#1A1A2A"/>
        <rect x="44" y="25" width="32" height="22" rx="4" fill="#1A1A2A" stroke="#C17F24" strokeWidth="0.5"/>
        <circle cx="60" cy="36" r="8" fill="#1A2A3A" stroke="#F5A623" strokeWidth="0.5"/>
        <circle cx="60" cy="36" r="5" fill="#0A1520"/>
        <text x="60" y="114" textAnchor="middle" fill="#F5A623" fontSize="8" fontFamily="sans-serif" fontWeight="bold">iPhone 17</text>
      </svg>
    ),
  },
  "reliquia-suprema": {
    label: "Relíquia Suprema",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="rs">
          <radialGradient id="rs1" cx="35%" cy="25%" r="70%"><stop offset="0%" stopColor="#AADDFF"/><stop offset="40%" stopColor="#5599CC"/><stop offset="100%" stopColor="#0A2040"/></radialGradient>
          <radialGradient id="rs2" cx="60%" cy="60%" r="50%"><stop offset="0%" stopColor="#F5A623" stopOpacity="0.6"/><stop offset="100%" stopColor="#F5A623" stopOpacity="0"/></radialGradient>
        </Defs>
        <circle cx="60" cy="62" r="38" fill="url(#rs2)" opacity="0.3"/>
        <polygon points="60,18 88,42 88,72 60,96 32,72 32,42" fill="url(#rs1)" stroke="#F5A623" strokeWidth="2"/>
        <polygon points="60,18 88,42 60,42 32,42" fill="#AADDFF" opacity="0.4"/>
        <polygon points="60,18 88,42 60,42" fill="#FFFFFF" opacity="0.25"/>
        <polygon points="60,42 88,42 88,72 60,96" fill="#5599CC" opacity="0.6"/>
        <polygon points="60,42 32,42 32,72 60,96" fill="#3377AA" opacity="0.7"/>
        <line x1="60" y1="18" x2="60" y2="96" stroke="#F5A623" strokeWidth="0.5" opacity="0.4"/>
        <line x1="32" y1="42" x2="88" y2="42" stroke="#F5A623" strokeWidth="0.5" opacity="0.4"/>
        <circle cx="34" cy="7" r="2" fill="#F5A623" opacity="0.7"/>
        <circle cx="60" cy="4" r="2" fill="#F5A623" opacity="0.7"/>
        <circle cx="86" cy="7" r="2" fill="#F5A623" opacity="0.7"/>
      </svg>
    ),
  },
  "robo-aspirador": {
    label: "Robô Aspirador",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="ra">
          <radialGradient id="ra1" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#3A3A4A"/><stop offset="100%" stopColor="#111118"/></radialGradient>
          <radialGradient id="ra2" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#F5A623" stopOpacity="0.15"/><stop offset="100%" stopColor="#F5A623" stopOpacity="0"/></radialGradient>
        </Defs>
        <ellipse cx="60" cy="100" rx="34" ry="6" fill="#000" opacity="0.5"/>
        <ellipse cx="60" cy="68" rx="34" ry="10" fill="url(#ra1)" stroke="#C17F24" strokeWidth="1.5"/>
        <ellipse cx="60" cy="40" rx="34" ry="32" fill="url(#ra1)" stroke="#F5A623" strokeWidth="2"/>
        <circle cx="60" cy="38" r="14" fill="#0D0D1A" stroke="#F5A623" strokeWidth="1.5"/>
        <circle cx="60" cy="38" r="9" fill="#111" stroke="#C17F24" strokeWidth="1"/>
        <circle cx="60" cy="38" r="2" fill="#F5A623" opacity="0.9"/>
        <circle cx="42" cy="52" r="3" fill="#00C2FF"/><circle cx="78" cy="52" r="3" fill="#F5A623"/><circle cx="60" cy="52" r="2" fill="#2E9E4F"/>
        <ellipse cx="60" cy="60" rx="36" ry="34" fill="url(#ra2)"/>
        <ellipse cx="32" cy="76" rx="6" ry="4" fill="#222" stroke="#C17F24" strokeWidth="1"/>
        <ellipse cx="88" cy="76" rx="6" ry="4" fill="#222" stroke="#C17F24" strokeWidth="1"/>
      </svg>
    ),
  },
  "robo-dock": {
    label: "Robô c/ Dock",
    render: (s) => (
      <svg viewBox="0 0 120 120" width={s} height={s}>
        <Defs id="rd">
          <radialGradient id="rd1" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#3A3A4A"/><stop offset="100%" stopColor="#111118"/></radialGradient>
          <radialGradient id="rd2" cx="50%" cy="30%" r="70%"><stop offset="0%" stopColor="#C17F24"/><stop offset="100%" stopColor="#5A3000"/></radialGradient>
        </Defs>
        <rect x="28" y="78" width="64" height="30" rx="8" fill="url(#rd2)" stroke="#F5A623" strokeWidth="1.5"/>
        <rect x="52" y="78" width="4" height="8" rx="1" fill="#F5A623"/>
        <rect x="64" y="78" width="4" height="8" rx="1" fill="#F5A623"/>
        <circle cx="84" cy="88" r="3" fill="#2E9E4F"/>
        <ellipse cx="60" cy="72" rx="28" ry="8" fill="url(#rd1)" stroke="#C17F24" strokeWidth="1.5"/>
        <ellipse cx="60" cy="44" rx="28" ry="28" fill="url(#rd1)" stroke="#F5A623" strokeWidth="2"/>
        <circle cx="60" cy="42" r="12" fill="#0D0D1A" stroke="#F5A623" strokeWidth="1.5"/>
        <circle cx="60" cy="42" r="3" fill="#F5A623"/>
        <circle cx="44" cy="55" r="2.5" fill="#00C2FF"/>
        <circle cx="76" cy="55" r="2.5" fill="#F5A623"/>
        <path d="M 52 90 L 56 85 L 59 88 L 63 82 L 68 90" fill="none" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
};

export const ICON_PREFIX = "icon:";

export function PremioIcon({ value, size = 96, className }: { value?: string | null; size?: number; className?: string }) {
  if (!value || !value.startsWith(ICON_PREFIX)) return null;
  const key = value.slice(ICON_PREFIX.length);
  const def = PREMIO_ICONS[key];
  if (!def) return null;
  return <div className={className} style={{ display: "inline-flex" }}>{def.render(size)}</div>;
}

export function isPremioIcon(value?: string | null): boolean {
  return !!value && value.startsWith(ICON_PREFIX);
}
