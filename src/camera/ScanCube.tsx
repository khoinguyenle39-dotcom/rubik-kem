import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { faceNormal } from '@cube/core';
import { useEffect, useMemo, useRef } from 'react';
import { Group, Matrix4, Quaternion, Vector3 } from 'three';
import { CubeModel } from '../cube3d/CubeModel';
import { FACES, type Readings, type ScanFace } from './scan';

export function captureOrientation(face: ScanFace): Quaternion {
  const front = new Vector3(...faceNormal(face));
  const top = new Vector3(...faceNormal(face === 'U' ? 'B' : face === 'D' ? 'F' : 'U'));
  const right = new Vector3().crossVectors(top, front);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, top, front)).invert();
}

function GuidedModel({face, readings, replay, onTurning}:{face:ScanFace;readings:Readings;replay:number;onTurning:(v:boolean)=>void}) {
  const group=useRef<Group>(null);
  const invalidate=useThree(s=>s.invalidate);
  const run=useRef<{from:Quaternion;to:Quaternion;start:number}|null>(null);
  const colours=useMemo(()=>FACES.flatMap(f=>Array.from({length:9},(_,i)=>{
    const rgb=readings[f]?.[i];return rgb?`rgb(${rgb.join(',')})`:'#ffffff';
  })),[readings]);
  useEffect(()=>{
    if(!group.current)return;
    const target=captureOrientation(face);
    if(replay>0) group.current.quaternion.copy(captureOrientation(FACES[Math.max(0,FACES.indexOf(face)-1)]));
    run.current={from:group.current.quaternion.clone(),to:target,start:performance.now()};
    onTurning(true);invalidate();
  },[face,replay,invalidate,onTurning]);
  useFrame(()=>{
    if(!run.current||!group.current)return;
    const {from,to,start}=run.current;
    const t=Math.min(1,(performance.now()-start)/(matchMedia('(prefers-reduced-motion: reduce)').matches?1:1100));
    group.current.quaternion.slerpQuaternions(from,to,t*t*(3-2*t));
    if(t<1)invalidate();else{run.current=null;onTurning(false);}
  });
  return <group ref={group}><CubeModel size={3} facelets={'U'.repeat(54)} animation={null} stickerColours={colours}/></group>;
}

export default function ScanCube(props:{face:ScanFace;readings:Readings;replay:number;onTurning:(v:boolean)=>void}) {
  return <Canvas frameloop="demand" dpr={[1,2]} camera={{position:[0,0,9],fov:32}} role="img" aria-label={`Mô hình hướng dẫn: mặt ${props.face} hướng vào camera`}>
    <ambientLight intensity={1.4}/><directionalLight position={[4,5,8]} intensity={1.4}/>
    <GuidedModel {...props}/>
  </Canvas>;
}
