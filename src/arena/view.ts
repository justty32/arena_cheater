import { ARENA_RADIUS, type ArenaState, type Fighter } from './model';
import { drawPuppet, drawWeapon } from './puppet';
import { createProjection, FORESHORTENING, insideArena, project, unproject, type Projection } from './projection';
type Context = CanvasRenderingContext2D;
function ellipse(ctx: Context, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, stroke?: string): void {
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
export class ArenaView {
  private ctx: Context;
  private projection: Projection = createProjection(1000,600);
  private width = 1000;
  private height = 600;
  constructor(private canvas: HTMLCanvasElement) {
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('無法建立競技場畫布');this.ctx=ctx;
    canvas.setAttribute('aria-label','45 度俯視競技場；點擊鬥士查看或施法，點擊地面投送武器');
  }
  private resize(): void {
    const rect=this.canvas.getBoundingClientRect();this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);
    const ratio=Math.min(window.devicePixelRatio||1,2);
    const w=Math.round(this.width*ratio),h=Math.round(this.height*ratio);
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.ctx.setTransform(ratio,0,0,ratio,0,0);this.projection=createProjection(this.width,this.height);
  }
  ground(clientX: number, clientY: number): {x:number;y:number}|undefined {
    const rect=this.canvas.getBoundingClientRect();const p=unproject(clientX-rect.left,clientY-rect.top,this.projection);
    return insideArena(p.x,p.y)?p:undefined;
  }
  pick(clientX: number, clientY: number, state: ArenaState): Fighter|undefined {
    const rect=this.canvas.getBoundingClientRect();const x=clientX-rect.left,y=clientY-rect.top;
    return [...state.fighters].filter(f=>f.hp>0).sort((a,b)=>b.y-a.y).find(f=>{
      const p=project(f.x,f.y,this.projection);const s=this.actorScale(f);
      return Math.abs(x-p.x)<Math.max(14,19*s)&&y>=p.y-68*s&&y<=p.y+9*s;
    });
  }
  private actorScale(f: Fighter): number {return this.projection.scale/38*(f.species==='bear'||f.species==='elephant'?1.13:1);}
  render(state: ArenaState, selectedId: string, targetMode?: 'fighter'|'ground'|null): void {
    this.resize();const ctx=this.ctx,p=this.projection;
    ctx.clearRect(0,0,this.width,this.height);this.venue(state.time);
    if(targetMode==='ground'){
      ctx.save();ctx.strokeStyle='#d5b97d88';ctx.lineWidth=2;ctx.setLineDash([5,7]);
      ctx.beginPath();ctx.ellipse(p.cx,p.cy,ARENA_RADIUS*p.scale,ARENA_RADIUS*p.scale*FORESHORTENING,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    for(const f of state.fighters){const at=project(f.x,f.y,p);const s=this.actorScale(f);
      ellipse(ctx,at.x,at.y+3,17*s,6*s,'#14111666');
      if(f.hp>0&&(f.id===selectedId||f.id===state.supportedId)){
        ctx.save();ctx.lineWidth=f.id===selectedId?2:1;ellipse(ctx,at.x,at.y,21*s,9*s,'#00000000',f.id===selectedId?'#f2d18a':'#89c4ac');ctx.restore();
      }
      if(targetMode==='fighter'&&f.hp>0){ctx.strokeStyle='#dfc28399';ctx.lineWidth=1;ctx.strokeRect(at.x-20*s,at.y-62*s,40*s,66*s);}
    }
    const things=[...state.fighters.map(f=>({y:f.y,f})),...state.items.map(item=>({y:item.y,item}))].sort((a,b)=>a.y-b.y);
    for(const thing of things){if('f'in thing)this.fighter(thing.f,state);else this.item(thing.item,state);}
    for(const effect of state.effects){const age=state.time-effect.at;if(age<0||age>1.2)continue;
      const at=project(effect.x,effect.y,p);ctx.save();ctx.globalAlpha=Math.max(0,1-age/1.2);
      if(effect.kind==='spell'){ctx.strokeStyle=effect.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(at.x,at.y,10+age*35,4+age*15,0,0,Math.PI*2);ctx.stroke();}
      ctx.font=`bold ${Math.max(11,p.scale*.36)}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#282127';
      ctx.strokeText(effect.text,at.x,at.y-p.scale*1.8-age*25);ctx.fillStyle=effect.color;ctx.fillText(effect.text,at.x,at.y-p.scale*1.8-age*25);ctx.restore();
    }
    if(state.status==='ready'){
      ctx.fillStyle='#c9bd9c';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('七位鬥士已就位 · 選擇你的贏家',p.cx,this.height-20);
    }
  }
  private fighter(f: Fighter, state:ArenaState):void{
    const ctx=this.ctx,at=project(f.x,f.y,this.projection),s=this.actorScale(f);
    ctx.save();ctx.translate(at.x,at.y);drawPuppet(ctx,f,state.time,s);ctx.restore();
    if(f.hp<=0)return;
    const w=40*s,y=at.y-70*s;ctx.fillStyle='#14141bd9';ctx.fillRect(at.x-w/2-2,y-2,w+4,9);
    ctx.fillStyle=f.id===state.supportedId?'#85c5a2':'#c59c6b';ctx.fillRect(at.x-w/2,y,w*Math.max(0,f.hp/f.maxHp),3);
    ctx.fillStyle='#649aab';ctx.fillRect(at.x-w/2,y+4,w*Math.max(0,f.stamina/f.maxStamina),2);
    ctx.font=`${Math.max(9,10*s)}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#e1d7c1';ctx.strokeStyle='#1c1b22';ctx.lineWidth=3;
    ctx.strokeText(f.name,at.x,y-5);ctx.fillText(f.name,at.x,y-5);
    if(f.buffs.length){ctx.fillStyle=f.buffs.some(b=>b.kind==='weakness')?'#bd9ce1':'#f0c36d';ctx.fillText('✦'.repeat(f.buffs.length),at.x,at.y+17*s);}
  }
  private item(item:ArenaState['items'][number],state:ArenaState):void{
    const ctx=this.ctx,p=this.projection;const at=project(item.x,item.y,p);
    const progress=Math.max(0,Math.min(1,(state.time-item.launched)/(item.landsAt-item.launched||1)));
    const lift=item.landed?0:Math.sin(progress*Math.PI)*p.scale*2.3;
    ellipse(ctx,at.x,at.y,10,4,'#15121a55');ctx.save();ctx.translate(at.x,at.y-lift);ctx.scale(p.scale/42,p.scale/42);
    if(item.landed){ctx.rotate(Math.PI/3);ctx.shadowColor='#efd587';ctx.shadowBlur=8;}else ctx.rotate(progress*Math.PI*3);
    drawWeapon(ctx,item.weapon);ctx.restore();
  }
  private venue(time:number):void {
    const ctx=this.ctx,p=this.projection,r=ARENA_RADIUS*p.scale,ry=r*FORESHORTENING;
    const bg=ctx.createRadialGradient(p.cx,p.cy,r*.3,p.cx,p.cy,r*1.4);bg.addColorStop(0,'#302a36');bg.addColorStop(1,'#101218');
    ctx.fillStyle=bg;ctx.fillRect(0,0,this.width,this.height);
    // Stone gallery follows the same forty-five-degree floor projection.
    for(let row=3;row>=0;row--){const rr=r+(row+1)*p.scale*.35;
      ellipse(ctx,p.cx,p.cy+12,rr,rr*FORESHORTENING,'#17171e','#38343e');
      ellipse(ctx,p.cx,p.cy-3*row,rr,rr*FORESHORTENING,row%2?'#282730':'#302d36','#4a424a');
      const count=46;
      for(let i=0;i<count;i++){const a=i*Math.PI*2/count+(row%2)*.07;
        ctx.strokeStyle='#17171f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.cx+Math.cos(a)*rr,p.cy-3*row+Math.sin(a)*rr*FORESHORTENING);ctx.lineTo(p.cx+Math.cos(a)*(rr-p.scale*.3),p.cy-3*row+Math.sin(a)*(rr-p.scale*.3)*FORESHORTENING);ctx.stroke();
      }
    }
    ellipse(ctx,p.cx,p.cy+10,r+8,ry+8,'#17141a','#8b7355');
    const sand=ctx.createRadialGradient(p.cx-r*.18,p.cy-ry*.2,10,p.cx,p.cy,r);
    sand.addColorStop(0,'#8e795a');sand.addColorStop(.65,'#786349');sand.addColorStop(1,'#4e4136');
    ellipse(ctx,p.cx,p.cy,r,ry,sand,'#baa175');
    // Deterministic grain, scratched rings, and stone inlays avoid external assets.
    ctx.save();ctx.beginPath();ctx.ellipse(p.cx,p.cy,r,ry,0,0,Math.PI*2);ctx.clip();
    for(let i=0;i<430;i++){
      const x=((i*173.17)%997)/997*2-1,y=((i*79.31)%991)/991*2-1;
      ctx.fillStyle=i%3?'#d1b98616':'#211c2320';ctx.fillRect(p.cx+x*r,p.cy+y*ry,i%4+1,1);
    }
    for(const rr of [.28,.65,.94]){ctx.lineWidth=1;ctx.strokeStyle='#ddc79022';ctx.beginPath();ctx.ellipse(p.cx,p.cy,r*rr,ry*rr,0,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle='#d9c18924';ctx.lineWidth=2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(p.cx+Math.cos(a)*r*.29,p.cy+Math.sin(a)*ry*.29);ctx.lineTo(p.cx+Math.cos(a)*r*.62,p.cy+Math.sin(a)*ry*.62);ctx.stroke();}
    ctx.translate(p.cx,p.cy);ctx.scale(1,FORESHORTENING);ctx.rotate(Math.PI/4);ctx.strokeStyle='#d6bd891f';ctx.strokeRect(-r*.19,-r*.19,r*.38,r*.38);ctx.rotate(Math.PI/4);ctx.strokeRect(-r*.19,-r*.19,r*.38,r*.38);ctx.restore();
    for(let i=0;i<8;i++)this.gate(-Math.PI/2+i*Math.PI/4,i===0,time);
  }
  private gate(angle:number,large:boolean,time:number):void{
    const ctx=this.ctx,p=this.projection;
    const x=p.cx+Math.cos(angle)*ARENA_RADIUS*p.scale*1.08,y=p.cy+Math.sin(angle)*ARENA_RADIUS*p.scale*FORESHORTENING*1.08;
    const size=p.scale*(large?.85:.58);
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#17171e';ctx.strokeStyle='#9b8764';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-size*.55,-size,size*1.1,size*1.18,[size*.5,size*.5,0,0]);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#4c4750';ctx.lineWidth=2;
    for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(j*size*.16,-size*.76);ctx.lineTo(j*size*.16,size*.16);ctx.stroke();}
    for(const side of [-1,1]){
      const tx=side*size*.85,ty=-size*.5;const glow=ctx.createRadialGradient(tx,ty,0,tx,ty,size*.75);glow.addColorStop(0,'#ffc46b55');glow.addColorStop(1,'#df733000');ctx.fillStyle=glow;ctx.fillRect(tx-size,ty-size,size*2,size*2);
      ctx.strokeStyle='#47332b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(tx,ty+8);ctx.lineTo(tx,ty+18);ctx.stroke();
      const flicker=1+Math.sin(time*11+angle*9)*.1;ellipse(ctx,tx,ty,3*flicker,7*flicker,'#e8944a');ellipse(ctx,tx,ty+1,1.7,4,'#ffe5a1');
    }
    ctx.restore();
  }
}
