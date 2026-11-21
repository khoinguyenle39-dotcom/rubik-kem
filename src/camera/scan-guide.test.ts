import { describe, expect, it } from 'vitest';
import { faceNormal } from '@cube/core';
import { Vector3 } from 'three';
import { sampleCentre } from './sample';
import { captureOrientation } from './ScanCube';
import { FACES } from './scan';

describe('guided capture',()=>{
  it('faces the camera with the same top edge used by facelet input',()=>{
    for(const face of FACES){
      const q=captureOrientation(face);
      expect(new Vector3(...faceNormal(face)).applyQuaternion(q).distanceTo(new Vector3(0,0,1))).toBeLessThan(1e-6);
      const top=face==='U'?'B':face==='D'?'F':'U';
      expect(new Vector3(...faceNormal(top)).applyQuaternion(q).distanceTo(new Vector3(0,1,0))).toBeLessThan(1e-6);
    }
  });
  it('reads white plastic around a blue logo instead of rejecting its colour spread',()=>{
    const data=new Uint8ClampedArray(360*360*4);
    for(let y=0;y<360;y++)for(let x=0;x<360;x++){
      const rgb=Math.abs(x-180)<18&&Math.abs(y-180)<18?[15,75,210]:[226,224,220];
      data.set([...rgb,255],(y*360+x)*4);
    }
    const sample=sampleCentre({width:360,height:360,data},true);
    expect(sample.rgb).toEqual([226,224,220]);
    expect(sample.spread).toBe(0);
  });
});
