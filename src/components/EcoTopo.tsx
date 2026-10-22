// Cabeçalho de todas as telas depois do login: logo, faixa verde com os postes e o usuário.
export default function EcoTopo({ nome, papel, onLogo }: { nome: string; papel: string; onLogo?: () => void }) {
  const partes = nome.trim().split(/\s+/);
  const iniciais = ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  return (
    <header className="eco-topo">
      <button type="button" className="eco-topo-logo-btn" onClick={onLogo} disabled={!onLogo} title={onLogo ? "Voltar ao início" : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-eco.png" alt="ecoelétrica engenharia" className="eco-topo-logo" />
      </button>
      <div className="eco-topo-faixa" aria-hidden="true">
        <svg viewBox="0 0 900 76" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="ecoFx" x1="0" x2="1"><stop offset="0" stopColor="#3db35a" /><stop offset=".45" stopColor="#1f7a4a" /><stop offset="1" stopColor="#0f4a3c" /></linearGradient>
            <radialGradient id="ecoSl" cx="540" cy="70" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fff6cf" stopOpacity=".95" /><stop offset=".25" stopColor="#ffe08a" stopOpacity=".45" /><stop offset="1" stopColor="#ffe08a" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="900" height="76" fill="url(#ecoFx)" />
          <rect width="900" height="76" fill="url(#ecoSl)" />
          <g stroke="#0d2f26" strokeWidth="2.2" opacity=".75" fill="none"><path d="M560 76V6M535 14h50M540 26h40" /><path d="M700 76V18M682 24h36" /></g>
          <g stroke="#0d2f26" strokeWidth="1" opacity=".45" fill="none"><path d="M0 22Q280 46 537 14" /><path d="M0 34Q300 60 585 14" /><path d="M585 14Q640 30 718 24" /><path d="M537 14Q620 36 682 24" /></g>
        </svg>
      </div>
      <div className="eco-topo-usuario">
        <span className="eco-avatar">{iniciais}</span>
        <div>
          <b>{nome}</b>
          <small>{papel}</small>
        </div>
      </div>
    </header>
  );
}
