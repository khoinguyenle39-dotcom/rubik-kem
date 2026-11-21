import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { sampleAt, sampleCentre } from './sample';
import { classifyScan, FACES, type Readings } from './scan';
import { FACE_NAMES, TOP_COLOURS, COLOUR_NAMES } from '../labels';
const ScanCube=lazy(()=>import('./ScanCube'));

export function Scanner({onDone,onClose}:{onDone:(s:string)=>void;onClose:()=>void}) {
  const video=useRef<HTMLVideoElement>(null);
  const stream=useRef<MediaStream|null>(null);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [readings,setReadings]=useState<Readings>({});
  const [index,setIndex]=useState(0);
  const [accepted,setAccepted]=useState(false);
  const [turning,setTurning]=useState(true);
  const [replay,setReplay]=useState(0);
  const face=FACES[index];
  useEffect(()=>{
    let cancelled=false;
    const stop=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
    const hidden=()=>{if(document.hidden){stop();onClose();}};
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',stop);
    async function start(){
      try {
        if(!navigator.mediaDevices?.getUserMedia) throw new Error('Camera cần HTTPS hoặc localhost. Bạn vẫn có thể nhập màu bằng tay.');
        const opened=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
        if(cancelled){opened.getTracks().forEach(t=>t.stop());return;}
        stream.current=opened;
        opened.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{setReady(false);setError('Camera đã ngắt. Hãy đóng rồi mở lại camera.');}));
        if(video.current){video.current.srcObject=opened;await video.current.play();}
      } catch(e){if(!cancelled){const name=e instanceof DOMException?e.name:'';setError(name==='NotAllowedError'?'Bạn chưa cho phép camera. Hãy cấp quyền trong trình duyệt hoặc nhập màu bằng tay.':name==='NotFoundError'?'Không tìm thấy camera. Bạn có thể nhập màu bằng tay.':name==='NotReadableError'?'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.':String(e instanceof Error?e.message:e));}}
    }
    void start();
    return()=>{cancelled=true;stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);};
  },[onClose]);
  const capture=()=>{
    const v=video.current;if(!v||!v.videoWidth||!ready||turning)return;
    // Match the centred square preview exactly, without mirroring.
    const side=Math.min(v.videoWidth,v.videoHeight),c=document.createElement('canvas');c.width=360;c.height=360;
    const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return;
    ctx.drawImage(v,(v.videoWidth-side)/2,(v.videoHeight-side)/2,side,side,0,0,360,360);
    const pixels=ctx.getImageData(0,0,360,360);
    // The guide spans 70% of the square; sample only the middle of each sticker.
    const cells=Array.from({length:9},(_,i)=>i===4?sampleCentre(pixels,face==='U'):sampleAt(pixels,54+(i%3+.5)*84,54+(Math.floor(i/3)+.5)*84,10));
    if(cells.some((c,i)=>i!==4&&c.spread>95)){setError('Một ô ngoài tâm có thể bị lóa hoặc lệch khung. Căn cả 9 ô theo lưới rồi chụp lại. Logo ở tâm được bỏ qua.');return;}
    if(cells.some(c=>c.lab[0]<8)){setError('Khung chụp quá tối hoặc ô màu nằm trên khe đen. Hãy tăng ánh sáng và căn lại lưới.');return;}
    setError('');
    const next={...readings,[face]:cells.map(c=>c.rgb)};setReadings(next);
    setAccepted(true);
    c.width=0;c.height=0;
  };
  const advance=()=>{
    if(Object.keys(readings).length===6){
      try {const result=classifyScan(readings);stream.current?.getTracks().forEach(t=>t.stop());onDone(result);}
      catch(e){setError(e instanceof Error?e.message:String(e));}
      return;
    }
    setTurning(true);setAccepted(false);setReplay(0);setIndex(FACES.findIndex(f=>!readings[f]));
  };
  return <section className="scanner" aria-label="Chụp sáu mặt Rubik">
    <div className="section-heading"><h2>Chụp mặt {FACE_NAMES[face]}</h2><button className="text-button" onClick={onClose}>Tắt camera</button></div>
    <p>Đưa tâm <strong>{COLOUR_NAMES[face]}</strong> về phía camera, tâm <strong>{TOP_COLOURS[face]}</strong> hướng lên trên. Giữ cả 9 ô trong khung.</p>
    <div className="scan-guide">
      <p className="scan-top">Phía trên: tâm <strong>{TOP_COLOURS[face]}</strong></p>
      <div className="scan-cube"><Suspense fallback={<p>Đang mở mô hình hướng dẫn…</p>}><ScanCube face={face} readings={readings} replay={replay} onTurning={setTurning}/></Suspense></div>
      <p aria-live="polite">{turning?'Xoay cả khối Rubik theo mô hình…':accepted?'Mặt vừa chụp đã lên màu. Đối chiếu với Rubik thật.':`Mặt cần chụp: tâm ${COLOUR_NAMES[face]}. Các mặt chưa chụp vẫn màu trắng.`}</p>
      <button className="text-button" disabled={turning||index===0} onClick={()=>setReplay(n=>n+1)}>Xem lại cách xoay cả khối</button>
    </div>
    <p className="small">Chỉ đổi cách cầm cả khối. Không xoay riêng các tầng giữa các ảnh. Mô hình được nhìn cùng hướng với camera.</p>
    <div className="camera-frame"><video ref={video} playsInline muted onLoadedData={()=>setReady(true)}/><div className="capture-grid" aria-hidden="true">{Array.from({length:9},(_,i)=><span key={i}/>)}</div></div>
    <div className="face-progress">{FACES.map((f,i)=><button key={f} disabled={turning||i===index} onClick={()=>{setTurning(true);setIndex(i);setReplay(0);setAccepted(!!readings[f]);setError('');}} aria-label={`Mặt tâm ${COLOUR_NAMES[f]}${readings[f]?', đã chụp':''}`} aria-current={i===index?'step':undefined}>{f} {readings[f]?'✓':''}</button>)}</div>
    {error&&<p className="error" role="alert">{error}</p>}
    <button className={`${accepted?'secondary':'primary'} wide`} disabled={!ready||turning} onClick={capture}>{accepted?'Chụp lại':`Chụp mặt ${face}`} ({Object.keys(readings).length}/6)</button>
    {accepted&&<button className="primary wide" disabled={turning} onClick={advance}>{Object.keys(readings).length===6?'Kiểm tra 6 mặt':'Xoay sang mặt tiếp theo'}</button>}
    <p className="small">Tâm trắng có logo xanh vẫn được nhận là tâm trắng. Hệ thống lấy mẫu quanh logo.</p>
    <p className="small">Chỉ giữ các mẫu màu trong phiên này. Không lưu hoặc tải ảnh lên.</p>
  </section>;
}
