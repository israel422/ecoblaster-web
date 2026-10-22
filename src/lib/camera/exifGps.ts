// Lê a coordenada gravada pela própria câmera dentro do JPEG (EXIF GPS), quando existe.
// Usado quando o GPS do navegador não respondeu — fotos da galeria costumam trazer isso.

export async function gpsDoExif(arquivo: Blob): Promise<{ lat: number; lon: number } | null> {
  try {
    const buf = new DataView(await arquivo.slice(0, 256 * 1024).arrayBuffer());
    if (buf.getUint16(0) !== 0xffd8) return null; // não é JPEG
    let p = 2;
    while (p + 4 < buf.byteLength) {
      const marcador = buf.getUint16(p);
      const tam = buf.getUint16(p + 2);
      if (marcador === 0xffe1 && buf.getUint32(p + 4) === 0x45786966) return lerTiff(buf, p + 10); // "Exif"
      if ((marcador & 0xff00) !== 0xff00) return null;
      p += 2 + tam;
    }
  } catch {
    // arquivo sem EXIF ou cortado: segue sem coordenada
  }
  return null;
}

function lerTiff(v: DataView, ini: number): { lat: number; lon: number } | null {
  const le = v.getUint16(ini) === 0x4949;
  const u16 = (o: number) => v.getUint16(ini + o, le);
  const u32 = (o: number) => v.getUint32(ini + o, le);
  const ifd0 = u32(4);
  let gpsIfd = 0;
  for (let i = 0, n = u16(ifd0); i < n; i++) {
    const e = ifd0 + 2 + i * 12;
    if (u16(e) === 0x8825) gpsIfd = u32(e + 8);
  }
  if (!gpsIfd) return null;
  const tags: Record<number, number> = {};
  for (let i = 0, n = u16(gpsIfd); i < n; i++) {
    const e = gpsIfd + 2 + i * 12;
    tags[u16(e)] = e;
  }
  const ref = (t: number) => (tags[t] ? String.fromCharCode(v.getUint8(ini + tags[t] + 8)) : "");
  const graus = (t: number) => {
    if (!tags[t]) return null;
    const off = u32(tags[t] + 8);
    const r = (k: number) => u32(off + k * 8) / (u32(off + k * 8 + 4) || 1);
    return r(0) + r(1) / 60 + r(2) / 3600;
  };
  const lat = graus(2), lon = graus(4);
  if (lat == null || lon == null || (lat === 0 && lon === 0)) return null;
  return { lat: ref(1) === "S" ? -lat : lat, lon: ref(3) === "W" ? -lon : lon };
}
