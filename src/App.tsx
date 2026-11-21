import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState, Component, type ReactNode } from 'react';
import { applyAlgorithm, applyFaceTurns, isSolved, parseFacelets, SOLVED, toFacelets, FACE_TURNS, type FaceTurn } from '@cube/core';
import type { SolveProgress } from '@cube/solver-contracts';
import { SolverClient, type Handle, type OptimalStatus, type SolverStatus } from './solver/client';
import { INITIAL_PLAYBACK, playbackReducer, faceletsAt, visibleTurn, nextMove } from './playback/playback';
import { Scanner } from './camera/Scanner';
import { FACES } from './camera/scan';
import { FACE_NAMES, COLOUR_NAMES, TOP_COLOURS } from './labels';
const CubeView=lazy(()=>import('./cube3d/CubeView'));
const blank=()=>FACES.map(f=>'....'+f+'....').join('');
const notation=(m:FaceTurn)=>m.face+(m.turns===2?'2':m.turns===3?"'":'');
class ViewBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?<p className="error">Thiết bị không mở được mô hình 3D. Hãy bật tăng tốc đồ họa hoặc dùng trình duyệt khác. Công thức vẫn hiển thị bên dưới.</p>:this.props.children;}}
export function App(){
  const [step,setStep]=useState(0),[camera,setCamera]=useState(false),[help,setHelp]=useState(false),[privacy,setPrivacy]=useState(false);
  const [stickers,setStickers]=useState(blank),[paint,setPaint]=useState('U'),[error,setError]=useState(''),[viewKey,setViewKey]=useState(0);
  const [playback,dispatch]=useReducer(playbackReducer,INITIAL_PLAYBACK);
  const [status,setStatus]=useState<SolverStatus|null>(null),[optimal,setOptimal]=useState<OptimalStatus>({kind:'none'});
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState<SolveProgress|null>(null),[proven,setProven]=useState(false),[elapsed,setElapsed]=useState(0);
  const client=useRef<SolverClient|null>(null),handle=useRef<Handle<unknown>|null>(null),epoch=useRef(0);
  const [speed,setSpeed]=useState(1);
  const [animationsEnabled,setAnimationsEnabled]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>()=>{epoch.current++;client.current?.dispose();},[]);
  useEffect(()=>{if(!busy)return;const start=Date.now();const id=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(id);},[busy]);
  const stop=useCallback(()=>{epoch.current++;handle.current?.cancel();handle.current=null;setBusy(false);setProgress(null);setError('Đã dừng tìm kiếm. Chưa có lời giải được chứng minh ngắn nhất.');},[]);
  const closeCamera=useCallback(()=>setCamera(false),[]);
  const scanDone=useCallback((s:string)=>{setStickers(s);setCamera(false);setStep(1);setError('');dispatch({type:'load',size:3,start:s,moves:[]});},[]);
  const change=(s:string)=>{setStickers(s);setProven(false);setError('');dispatch({type:'load',size:3,start:s,moves:[]});};
  const parsed=useMemo(()=>stickers.includes('.')?null:parseFacelets(stickers),[stickers]);
  const valid=parsed?.ok===true;
  const counts=FACES.map(f=>stickers.split(f).length-1);
  const demo=()=>{const r=applyAlgorithm(SOLVED,"R U R' U'");if(r.ok){change(toFacelets(r.value));setStep(1);}};
  const solve=async()=>{
    if(!parsed?.ok)return;
    const cube=parsed.value,id=++epoch.current;
    setError('');setBusy(true);setProven(false);setProgress(null);setElapsed(0);
    try{
      if(isSolved(cube)){dispatch({type:'load',size:3,start:stickers,moves:[]});setProven(true);setStep(2);return;}
      if(client.current?.getStatus().kind==='failed'){client.current.dispose();client.current=null;}
      if(!client.current){const c=new SolverClient(()=>new Worker(new URL('./solver/solver.worker.ts',import.meta.url),{type:'module'}));client.current=c;c.subscribe(()=>{setStatus(c.getStatus());setOptimal(c.getOptimalStatus());});setStatus(c.getStatus());}
      const c=client.current;
      if(c.getOptimalStatus().kind!=='ready'){
        const prep=c.prepare('standard');handle.current=prep;const report=await prep.result;
        if(id!==epoch.current||!report)return;
      }
      const search=c.solve(cube,{mode:'optimal',tier:'standard'},{onProgress:p=>{if(id===epoch.current)setProgress(p);}});
      handle.current=search;const result=await search.result;
      if(id!==epoch.current)return;
      if(result.stoppedBy!=='proven'||result.moves===null)throw new Error('Chưa chứng minh được lời giải ít nước nhất. Bạn có thể thử lại.');
      const moves=result.moves.map(i=>FACE_TURNS[i]);
      if(!isSolved(applyFaceTurns(cube,moves)))throw new Error('Lời giải không vượt qua kiểm tra. Vui lòng thử lại.');
      dispatch({type:'load',size:3,start:stickers,moves:moves.map(m=>({...m,from:1,to:1}))});
      setProven(true);setViewKey(k=>k+1);setStep(2);
    }catch(e){if(id===epoch.current)setError(e instanceof Error?e.message:String(e));}
    finally{if(id===epoch.current){setBusy(false);handle.current=null;}}
  };
  const onAnimationDone=useCallback(()=>dispatch({type:'animation-done'}),[]);
  const animation=useMemo(()=>playback.animating?{key:playback.animating,turn:visibleTurn(playback.animating),durationMs:animationsEnabled?900/speed:1,onDone:onAnimationDone}:null,[playback.animating,speed,animationsEnabled,onAnimationDone]);
  const next=nextMove(playback),hasMoves=playback.moves.length>0,finished=proven&&!playback.animating&&playback.position===playback.moves.length;
  const shownTurn=animation?.turn??next;
  const activeMove=playback.animating?.forward===false?playback.position-1:playback.position;
  useEffect(()=>{const pauseWhenHidden=()=>{if(document.hidden)dispatch({type:'pause'});};document.addEventListener('visibilitychange',pauseWhenHidden);return()=>document.removeEventListener('visibilitychange',pauseWhenHidden);},[]);
  const reset=()=>{epoch.current++;handle.current?.cancel();setBusy(false);setCamera(false);change(blank());setStep(0);setProven(false);dispatch({type:'load',size:3,start:toFacelets(SOLVED),moves:[]});};
  return <div className="app-shell">
    <header><a className="brand" href="/" aria-label="Rubik Kem, trang chủ"><span className="brand-mark" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i}/>)}</span>rubik kem<span className="brand-sub">3 × 3 × 3</span></a><div className="header-actions"><button className="text-button" onClick={()=>setHelp(true)}>Cách sử dụng</button><button className="text-button privacy-link" onClick={()=>setPrivacy(true)}>Quyền riêng tư</button></div></header>
    <main>
      <div className="intro"><div><h1>Mỗi lần, một nước xoay.</h1><p>Chụp Rubik của bạn. Cùng giải từng bước.</p></div><span className="local-label"><LockIcon/> Xử lý trên thiết bị</span></div>
      <nav className="steps" aria-label="Các bước giải">{['Chụp sáu mặt','Kiểm tra màu','Giải Rubik'].map((s,i)=><button key={s} disabled={busy||camera||(i===2&&!proven)} aria-current={step===i?'step':undefined} onClick={()=>{dispatch({type:'pause'});setStep(i);}}><span>{i+1}</span>{s}{(i===0&&valid)||(i===1&&proven)?<b aria-label="Hoàn tất">✓</b>:null}</button>)}</nav>
      <div className="workbench">
        <section className="cube-stage" aria-label="Mô hình Rubik" hidden={camera}>
          <div className="stage-top"><span>{step===0?'Rubik 3D':step===1?'Bản xem trước':'Lời giải của bạn'}</span><button className="text-button" onClick={()=>setViewKey(k=>k+1)}>Đặt lại góc nhìn</button></div>
          <div className="cube-canvas"><ViewBoundary><Suspense fallback={<p className="loading">Đang mở mô hình 3D…</p>}><CubeView size={3} facelets={faceletsAt(playback)} animation={animation} hint={step===2&&!animation?next:null} viewKey={viewKey} label="Rubik 3D, kéo để xoay góc nhìn"/></Suspense></ViewBoundary></div>
          <p className="orbit-hint">Kéo để nhìn quanh khối Rubik</p>
          {step===2&&proven?<div className="playback"><div className="move-caption"><strong>{finished?'Hoàn thành!':shownTurn?notation(shownTurn):''}</strong><span>{finished?'Sáu mặt đã về đúng màu.':shownTurn?`Xoay mặt ${FACE_NAMES[shownTurn.face]} ${shownTurn.turns===2?'180°':shownTurn.turns===3?'90° ngược chiều kim đồng hồ':'90° theo chiều kim đồng hồ'}.`:''}</span></div><div className="playback-buttons"><button disabled={!playback.position||!!animation} onClick={()=>dispatch({type:'step',forward:false})}>Quay lại</button><span>{playback.position} / {playback.moves.length}</span><button className="primary" disabled={finished||!!animation} onClick={()=>dispatch({type:'step',forward:true})}>Tiếp theo</button></div><button className="secondary wide" disabled={!hasMoves||!animationsEnabled} onClick={()=>dispatch({type:'toggle'})}>{playback.playing?'Tạm dừng':finished?'Chạy lại công thức':'Chạy công thức'}</button><label className="animation-toggle"><input type="checkbox" checked={animationsEnabled} disabled={!!animation||playback.playing} onChange={e=>setAnimationsEnabled(e.target.checked)}/>Hiệu ứng xoay</label>{!animationsEnabled&&<p className="small">Bật hiệu ứng để xem từng tầng xoay theo công thức.</p>}<label className="speed">Tốc độ xoay <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="0.6">Chậm</option><option value="1">Vừa</option><option value="1.7">Nhanh</option></select></label></div>:<div className="hold-guide"><span className="colour-dot" data-colour="U"/>Tâm trắng ở trên<span className="colour-dot" data-colour="F"/>Tâm xanh lá ở trước</div>}
        </section>
        <section className="task-panel">
          {camera?<Scanner onDone={scanDone} onClose={closeCamera}/>:step===0?<>
            <div className="camera-symbol"><CameraIcon/></div><h2>Bắt đầu với Rubik của bạn</h2><p>Cho phép camera để nhận diện màu của sáu mặt Rubik.</p>
            <div className="permission-note"><LockIcon/><p>Camera chỉ dùng để giải Rubik. Ảnh được xử lý trên thiết bị, không lưu hoặc gửi lên máy chủ. Không dùng micro.</p></div>
            <button className="primary wide" onClick={()=>{setError('');setCamera(true);}}><CameraIcon/>Cho phép dùng camera</button>
            <button className="secondary wide" onClick={()=>{setStep(1);dispatch({type:'load',size:3,start:stickers,moves:[]});}}>Nhập màu bằng tay</button>
            <div className="try-demo"><span>Chưa có Rubik bên cạnh?</span><button className="text-button" onClick={demo}>Thử một khối mẫu</button></div>
            <p className="small">Dùng Rubik 6 màu thông thường. Chụp nơi đủ sáng, tránh phản chiếu trên các ô màu.</p>
          </>:step===1?<>
            <div className="section-heading"><h2>Kiểm tra từng ô màu</h2><button className="text-button" disabled={busy} onClick={()=>{setStep(0);setCamera(true);}}>Chụp lại</button></div>
            <p>Chọn màu bên dưới rồi chạm ô cần sửa. Ô tâm được cố định.</p>
            <div className="palette" role="group" aria-label="Chọn màu">{FACES.map((f,i)=><button key={f} disabled={busy} data-colour={f} aria-label={`Màu ${COLOUR_NAMES[f]}, ${counts[i]}/9 ô`} aria-pressed={paint===f} onClick={()=>setPaint(f)}><span>{paint===f?'✓':''}</span><small>{counts[i]}/9</small></button>)}</div>
            <div className="face-editor">{FACES.map((f,fi)=><div className="face-block" key={f}><div className="face-title">{f} <span>{FACE_NAMES[f]}</span></div><div className="sticker-grid">{Array.from({length:9},(_,i)=>{const at=fi*9+i;return <button key={i} data-colour={stickers[at]} disabled={i===4||busy} aria-label={`Mặt ${f}, ô ${i+1}, ${COLOUR_NAMES[stickers[at]]??'chưa nhập'}${i===4?', ô tâm':''}`} onClick={()=>change(stickers.slice(0,at)+paint+stickers.slice(at+1))}>{i===4?f:stickers[at]==='.'?'?':''}</button>;})}</div><small>Phía trên: {TOP_COLOURS[f]}</small></div>)}</div>
            <p className={valid?'validation':'small'} role="status">{valid?'✓ Trạng thái Rubik hợp lệ.':parsed&&!parsed.ok?'Màu hoặc hướng mặt chưa hợp lệ. Kiểm tra đủ 9 ô mỗi màu và hướng phía trên của từng mặt.':`Còn ${stickers.split('.').length-1} ô chưa nhập.`}</p>
            {!busy?<><button className="primary wide" disabled={!valid} onClick={()=>void solve()}>Tìm lời giải ít nước nhất</button><p className="small">Có thể mất nhiều phút hoặc lâu hơn. Giữ trang mở trong khi tính. Không tự đổi sang lời giải gần tối ưu.</p></>:<div className="search-status" role="status"><strong>{progress?`Đang kiểm tra lời giải ${progress.depth} nước…`:optimal.kind==='preparing'?'Đang chuẩn bị bộ giải…':'Đang khởi động bộ giải…'}</strong><p>{elapsed} giây đã trôi qua{progress?` · ${new Intl.NumberFormat('vi').format(progress.nodes)} trạng thái đã xét`:''}</p>{optimal.kind==='preparing'&&<progress max={optimal.total||1} value={optimal.done}/>}<button onClick={stop}>Dừng tìm kiếm</button></div>}
            {status?.kind==='failed'&&<p className="error">Không khởi động được bộ giải: {status.message}</p>}
          </>:<>
            <div className="section-heading"><h2>{playback.moves.length} nước xoay</h2><span className="proof">Ít nước nhất</span></div><p>Giữ tâm trắng ở trên, tâm xanh lá ở trước. Bấm “Tiếp theo” và xoay theo mô hình.</p>
            <div className="move-list" aria-label="Công thức giải">{playback.moves.map((m,i)=><button key={i} aria-label={`Đến trước nước ${i+1}: ${notation(m)}`} aria-current={i===activeMove?'step':undefined} data-done={i<playback.position} disabled={!!animation} onClick={()=>dispatch({type:'seek',position:i})}>{notation(m)}</button>)}</div>
            <div className="notation-key"><h3>Đọc công thức</h3><p><b>R</b> xoay mặt phải 90°<br/><b>R'</b> xoay ngược lại<br/><b>R2</b> xoay mặt phải 180°</p><p className="small">Chiều xoay tính khi nhìn thẳng vào mặt được xoay. U: trên, D: dưới, L: trái, F: trước, B: sau. Mỗi ký hiệu là 1 nước.</p></div>
            <button className="secondary wide" onClick={()=>dispatch({type:'seek',position:0})}>Xem lại từ đầu</button><button className="text-button wide" onClick={reset}>Giải một khối khác</button>
          </>}
          {error&&<p className="error" role="alert">{error}</p>}
        </section>
      </div>
      <footer><span>Rubik Kem</span><span>Chậm một chút cũng được. Cứ xoay đúng từng bước.</span><button className="text-button" onClick={()=>setPrivacy(true)}>Dữ liệu của bạn</button></footer>
    </main>
    {(help||privacy)&&<InfoDialog title={privacy?'Camera & quyền riêng tư':'Cách giải cùng Rubik Kem'} onClose={()=>{setHelp(false);setPrivacy(false);}}>{privacy?<><p>Website chỉ yêu cầu camera khi bạn bấm cho phép. Không yêu cầu micro, vị trí hay tài khoản.</p><p>Khung hình được đọc trong bộ nhớ để lấy màu Rubik. Không ghi video, không lưu ảnh, không tải ảnh hoặc trạng thái Rubik lên máy chủ. Không cài công cụ quảng cáo hay phân tích hành vi.</p><p>Camera tắt khi chụp đủ sáu mặt, khi bạn bấm “Tắt camera”, chuyển tab hoặc rời trang. Tải lại trang sẽ xóa phiên giải và mẫu màu.</p><p>Máy chủ cung cấp các tệp website có thể nhận thông tin kết nối kỹ thuật thông thường, như địa chỉ IP. Cam kết không tải ảnh lên áp dụng cho mã ứng dụng này.</p><p className="small">Bộ giải và mô hình dùng mã nguồn MIT từ cube-solver của MrDenzzz. <a href="/THIRD-PARTY-LICENSE.txt" target="_blank" rel="noreferrer">Giấy phép</a>.</p></>:<><p>1. Chụp sáu mặt, giữ đúng màu tâm và hướng phía trên như chỉ dẫn. Chỉ đổi cách cầm cả khối, không xoay riêng các tầng khi đang chụp.</p><p>2. Đối chiếu 54 ô với Rubik thật. Chọn màu rồi chạm vào ô bị nhận diện sai.</p><p>3. Tìm lời giải ít nước nhất. Việc chứng minh tối ưu có thể lâu; bạn luôn có thể dừng.</p><p>4. Giữ tâm trắng phía trên và xanh lá phía trước. Bấm “Tiếp theo” để xoay một nước, “Quay lại” để hoàn tác một nước.</p><p className="small">Giao diện hỗ trợ Rubik màu chuẩn: trắng đối vàng, xanh lá đối xanh dương, đỏ đối cam. Màu giao diện hồng kem không thay đổi màu thực của Rubik.</p></>}</InfoDialog>}
  </div>;
}
function InfoDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="section-heading"><h2>{title}</h2><button onClick={onClose} aria-label="Đóng">Đóng</button></div>{children}</dialog>;}
function CameraIcon(){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M8 5l1-2h6l1 2h4a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z"/><circle cx="12" cy="12" r="4"/></svg>;}
function LockIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 018 0v3"/><path d="M12 14v3"/></svg>;}

