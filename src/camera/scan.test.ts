import { describe, expect, it } from 'vitest';
import { applyAlgorithm, SOLVED, toFacelets, parseFacelets } from '@cube/core';
import { classifyScan, FACES, type Readings } from './scan';
import type { Rgb } from './colour';
const colours:Record<string,Rgb>={U:[220,218,210],R:[198,32,22],F:[27,142,56],D:[230,208,12],L:[240,111,19],B:[25,83,188]};
describe('camera samples and face order',()=>{
 it('recovers a scrambled cube from 54 samples with modest exposure noise',()=>{
  const r=applyAlgorithm(SOLVED,"R U2 F' L D B2");if(!r.ok)throw Error();const s=toFacelets(r.value);
  const readings:Readings={};FACES.forEach((f,j)=>{readings[f]=Array.from({length:9},(_,i)=>colours[s[j*9+i]].map(v=>Math.max(0,Math.min(255,v+(i%3-1)*7))) as unknown as Rgb[]);});
  const recovered=classifyScan(readings);expect(recovered).toBe(s);expect(parseFacelets(recovered).ok).toBe(true);
 });
 it('rejects incomplete capture',()=>expect(()=>classifyScan({})).toThrow());
});
