// Assemble genuine recorded play; no synthetic gameplay, production data or uploads.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/promo-20261023');
const timeline=JSON.parse(fs.readFileSync(path.join(out,'capture-timeline.json'),'utf8'));
const time=name=>timeline.scenes.find(scene=>scene.name===name).seconds;
const clips=[
  ['startup',2.8,''],['home',2.8,'Devreni kur.'],['modules',3.0,'Modüllerini keşfet.'],
  ['cores',3.0,'Çekirdeğini seç.'],['shop',2.8,'Gücünü geliştir.'],
  ['events',2.5,'Turnuvalara katıl.'],['matchmaking',1.8,'Savaş başlıyor.'],
  ['battle',18.0,'Stratejini konuştur.'],
];
const ffmpeg=process.env.GRIDSHARD_FFMPEG||'ffmpeg';
const ffprobe=process.env.GRIDSHARD_FFPROBE||'ffprobe';
let cursor=0;
const cuts=clips.map(([name,duration,caption])=>{
  const start=time(name)+0.15,next=timeline.scenes[timeline.scenes.findIndex(s=>s.name===name)+1]?.seconds??time('end');
  const length=Math.min(duration,next-start-0.1);
  if(length<0.5) throw new Error(`Not enough real footage for ${name}`);
  const clip={name,sourceStart:start,duration:length,start:cursor,caption};cursor+=length;return clip;
});
const endDuration=4,total=cursor+endDuration,battle=cuts.find(c=>c.name==='battle').start;
const font=path.join(out,'promo-font.tmp.ttf');
const fontSource=path.join(process.env.WINDIR||'C:/Windows','Fonts/arialbd.ttf');
if(!fs.existsSync(fontSource)) throw new Error('A Turkish-capable bold TTF is required for captions.');
fs.copyFileSync(fontSource,font);
const inputAudio=name=>path.join(root,'client/assets/audio',name);
const inputs=['-i',path.join(out,'GRIDSHARD-gercek-oyun-ham.webm'),
  '-stream_loop','-1','-i',inputAudio('menu_v8_02_akim_hatti.wav'),
  '-stream_loop','-1','-i',inputAudio('battle_v9_02_pulse.wav'),
  '-stream_loop','-1','-i',inputAudio('battle_v9_03_percussion.wav'),
  '-stream_loop','-1','-i',inputAudio('battle_v9_04_ostinato.wav'),
  '-loop','1','-framerate','30','-i',path.join(root,'client/assets/branding/startup-circuit-v1/reactor-logo.webp')];
const filters=cuts.map((clip,i)=>`[0:v]trim=start=${clip.sourceStart}:duration=${clip.duration},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,setsar=1,fps=30[v${i}]`);
filters.push(`${cuts.map((_,i)=>`[v${i}]`).join('')}concat=n=${cuts.length}:v=1:a=0[game]`);
let stream='game';
for(const [i,clip] of cuts.entries()){
  if(!clip.caption)continue;
  const next=`caption${i}`,until=Math.min(clip.start+clip.duration,clip.start+3);
  filters.push(`[${stream}]drawbox=x=0:y=1730:w=iw:h=150:color=0x03122f@0.86:t=fill:enable='between(t,${clip.start},${until})',drawtext=fontfile=promo-font.tmp.ttf:text='${clip.caption}':fontcolor=0xeefaff:fontsize=48:x=(w-tw)/2:y=1778:enable='between(t,${clip.start},${until})'[${next}]`);
  stream=next;
}
filters.push(`color=c=0x03122f:s=1080x1920:r=30:d=${endDuration}[card]`);
filters.push('[5:v]scale=400:400:flags=lanczos,format=rgba[logo]');
filters.push(`[card][logo]overlay=x=(W-w)/2:y=500:shortest=1,drawtext=fontfile=promo-font.tmp.ttf:text='GRIDSHARD':fontcolor=0xeefaff:fontsize=110:x=(w-tw)/2:y=970,drawtext=fontfile=promo-font.tmp.ttf:text='Devreni kur.':fontcolor=0x71eee1:fontsize=48:x=(w-tw)/2:y=1140,drawtext=fontfile=promo-font.tmp.ttf:text='Stratejini konuştur.':fontcolor=0x71eee1:fontsize=48:x=(w-tw)/2:y=1215[endcard]`);
filters.push(`[${stream}][endcard]concat=n=2:v=1:a=0,fade=t=in:st=0:d=0.3,fade=t=out:st=${total-0.6}:d=0.6,format=yuv420p[video]`);
filters.push(`[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=duration=${total},asetpts=PTS-STARTPTS,volume=0.65,afade=t=in:st=0:d=0.6,afade=t=out:st=${battle-0.5}:d=1.5[menu]`);
for(const [i,volume] of [[2,0.35],[3,0.31],[4,0.28]]) filters.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=duration=${total-battle},asetpts=PTS-STARTPTS,volume=${volume},afade=t=in:st=0:d=1.2,afade=t=out:st=${total-battle-1.3}:d=1.3,adelay=${Math.round(battle*1000)}|${Math.round(battle*1000)}[a${i}]`);
filters.push('[menu][a2][a3][a4]amix=inputs=4:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9,aformat=sample_rates=48000:channel_layouts=stereo[audio]');
const filename=path.join(out,'GRIDSHARD-tanitim-1080x1920.mp4');
try{
  execFileSync(ffmpeg,['-hide_banner','-y',...inputs,'-filter_complex',filters.join(';'),
    '-map','[video]','-map','[audio]','-t',String(total),'-c:v','libx264','-preset','medium','-crf','19',
    '-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-metadata','title=GRIDSHARD — Devreni kur. Stratejini konuştur.',filename],
    {cwd:out,windowsHide:true,stdio:['ignore','ignore','pipe'],maxBuffer:8*1024*1024});
  const probe=JSON.parse(execFileSync(ffprobe,['-v','error','-show_format','-show_streams','-of','json',filename],{windowsHide:true,encoding:'utf8'}));
  const report={output:filename,source:'GRIDSHARD-gercek-oyun-ham.webm',duration:total,cuts,
    capturedAudio:false,soundtrack:'Original GRIDSHARD menu_v8_02 + battle_v9 pulse/percussion/ostinato, added in edit',
    sourceResolution:timeline.video,upscaled:true,artificialGameplay:false,probe};
  fs.writeFileSync(path.join(out,'edit-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({filename,duration:total,bytes:fs.statSync(filename).size}));
}finally{
  fs.unlinkSync(font); // Only our private temporary copy, never the system font.
}
