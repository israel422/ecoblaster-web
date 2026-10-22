// GPS do registro: começa a buscar assim que o wizard abre e guarda a última posição boa.
// Antes, o GPS só era pedido no instante em que a câmera abria (8 s, sem guardar nada): com a
// câmera na frente muitos Android pausam a localização e a foto saía "GPS: indisponível".

export type StatusGps = "buscando" | "ok" | "negado" | "desligado" | "sem_sinal" | "sem_suporte";
export type PosicaoGps = { lat: number; lon: number; precisao: number; em: number };

const IDADE_MAX_MS = 2 * 60 * 1000; // posição mais velha que isso não vale para a foto

let watchId: number | null = null;
let ultima: PosicaoGps | null = null;
let status: StatusGps = "buscando";
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function iniciarGps() {
  if (typeof navigator === "undefined") return;
  if (!navigator.geolocation) {
    status = "sem_suporte";
    avisar();
    return;
  }
  if (watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      ultima = { lat: pos.coords.latitude, lon: pos.coords.longitude, precisao: pos.coords.accuracy, em: Date.now() };
      status = "ok";
      avisar();
    },
    (erro) => {
      // 1 = permissão negada · 2 = posição indisponível (GPS desligado) · 3 = demorou demais
      status = erro.code === 1 ? "negado" : erro.code === 2 ? "desligado" : ultima ? status : "sem_sinal";
      if (erro.code === 1 && watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      avisar();
    },
    { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 }
  );
}

// Para tentar de novo depois que o operador liberou a permissão / ligou o GPS
export function reiniciarGps() {
  if (watchId !== null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchId);
  watchId = null;
  status = "buscando";
  avisar();
  iniciarGps();
}

export function statusGps(): { status: StatusGps; posicao: PosicaoGps | null } {
  const fresca = ultima && Date.now() - ultima.em <= IDADE_MAX_MS ? ultima : null;
  return { status: fresca ? "ok" : status === "ok" ? "buscando" : status, posicao: fresca };
}

export function ouvirGps(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

// Posição para a foto: a última boa (até 2 min) ou espera chegar uma, até `esperaMs`.
export function posicaoParaFoto(esperaMs = 10_000): Promise<PosicaoGps | null> {
  iniciarGps();
  const agora = statusGps();
  if (agora.posicao) return Promise.resolve(agora.posicao);
  if (agora.status === "negado" || agora.status === "sem_suporte") return Promise.resolve(null);
  return new Promise((resolve) => {
    const fim = setTimeout(() => {
      parar();
      resolve(statusGps().posicao);
    }, esperaMs);
    const parar = ouvirGps(() => {
      const s = statusGps();
      if (s.posicao || s.status === "negado") {
        clearTimeout(fim);
        parar();
        resolve(s.posicao);
      }
    });
  });
}

// Motivo curto gravado na foto quando ela fica sem coordenada (para diagnosticar depois)
export function motivoSemGps(): string {
  const s = statusGps().status;
  return s === "negado" ? "permissao_negada" : s === "desligado" ? "gps_desligado" : s === "sem_suporte" ? "sem_suporte" : "sem_sinal";
}
