import { ciede2000, srgbToLab, type Rgb } from './colour';
export const FACES = ['U','R','F','D','L','B'] as const;
export type ScanFace = typeof FACES[number];
export type Readings = Partial<Record<ScanFace, readonly Rgb[]>>;
export function classifyScan(readings: Readings): string {
  const centres = FACES.map(f => {
    const cells = readings[f];
    if (!cells || cells.length !== 9) throw new Error('Cần chụp đủ 6 mặt.');
    return srgbToLab(...cells[4]);
  });
  return FACES.map((f,face) => readings[f]!.map((rgb,i) => {
    if(i===4) return f;
    const lab=srgbToLab(...rgb);
    let best=0;
    for(let j=1;j<6;j++) if(ciede2000(lab,centres[j])<ciede2000(lab,centres[best])) best=j;
    return FACES[best];
  }).join('')).join('');
}
