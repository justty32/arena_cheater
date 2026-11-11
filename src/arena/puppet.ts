import type { Fighter, Weapon } from './model';
type Context = CanvasRenderingContext2D;
interface Bone { x: number; y: number; angle?: number; paint?: (ctx: Context) => void; children?: Bone[] }
function bone(ctx: Context, node: Bone): void {
  ctx.save(); ctx.translate(node.x, node.y); ctx.rotate(node.angle ?? 0);
  node.paint?.(ctx); node.children?.forEach((child) => bone(ctx, child)); ctx.restore();
}
function oval(ctx: Context, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
function polygon(ctx: Context, points: number[], fill: string): void {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
export function drawWeapon(ctx: Context, weapon: Weapon): void {
  ctx.lineWidth = 1.3; ctx.strokeStyle = '#29262a';
  if (weapon === 'sword') {
    polygon(ctx, [-2, 1, -2, -21, 1, -27, 4, -21, 3, 1], '#d7e3df');
    ctx.strokeStyle = '#ffffe3'; ctx.beginPath(); ctx.moveTo(1, -22); ctx.lineTo(1, -2); ctx.stroke();
    ctx.strokeStyle = '#29262a'; ctx.fillStyle = '#bd9658'; ctx.fillRect(-7, 0, 15, 3); ctx.strokeRect(-7, 0, 15, 3);
    ctx.fillStyle = '#5f3f35'; ctx.fillRect(-1, 3, 4, 7);
  } else if (weapon === 'club') {
    polygon(ctx, [-2, 8, -3, -8, -7, -17, -5, -25, 4, -26, 7, -19, 3, -8, 2, 8], '#93724b');
    ctx.strokeStyle = '#d0b683'; ctx.beginPath(); ctx.moveTo(-2, -21); ctx.lineTo(0, -8); ctx.stroke();
  } else if (weapon === 'shield') {
    oval(ctx, 0, -4, 12, 14, '#aa8250'); oval(ctx, 0, -4, 9, 11, '#4b5961');
    ctx.strokeStyle = '#cfb77d'; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -4); ctx.moveTo(0, -14); ctx.lineTo(0, 6); ctx.stroke();
    oval(ctx, 0, -4, 3, 3, '#d0b782');
  }
}
function head(ctx: Context, f: Fighter): void {
  const skin: Record<Fighter['species'], string> = {wolf:'#a9b5ba',bear:'#a17a56',elephant:'#9babb1',bull:'#99705a',porcupine:'#b18d71',snake:'#81986c',deer:'#c19a6d'};
  const color = skin[f.species];
  if (f.species === 'wolf') {
    polygon(ctx, [-10,-8,-9,-22,-1,-13], color); polygon(ctx,[2,-13,10,-22,12,-7],color);
  } else if (f.species === 'bear') {
    oval(ctx,-9,-13,5,5,color); oval(ctx,9,-13,5,5,color);
  } else if (f.species === 'elephant') {
    oval(ctx,-11,-5,8,12,color); oval(ctx,11,-5,8,12,color);
  } else if (f.species === 'bull' || f.species === 'deer') {
    ctx.strokeStyle='#e2d3aa'; ctx.lineWidth=3;
    for (const side of [-1,1]) {
      ctx.beginPath(); ctx.moveTo(side*7,-12); ctx.lineTo(side*12,-20); ctx.lineTo(side*11,-26); ctx.stroke();
      if(f.species==='deer'){ctx.beginPath();ctx.moveTo(side*12,-20);ctx.lineTo(side*18,-23);ctx.moveTo(side*10,-22);ctx.lineTo(side*5,-26);ctx.stroke();}
    }
    ctx.strokeStyle='#25262a'; ctx.lineWidth=1.5;
  } else if (f.species === 'porcupine') {
    for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;polygon(ctx,[Math.cos(a)*7,-6+Math.sin(a)*7,Math.cos(a)*17,-6+Math.sin(a)*20,Math.cos(a+.3)*8,-6+Math.sin(a+.3)*8],'#d2c4a0');}
  }
  oval(ctx,0,-6,f.species==='snake'?11:10,f.species==='snake'?9:12,color);
  if(f.species==='elephant') {
    ctx.strokeStyle=color; ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(3,-1);ctx.quadraticCurveTo(12,17,3,17);ctx.stroke();
    ctx.strokeStyle='#e9dfc5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,1);ctx.lineTo(-5,9);ctx.moveTo(8,1);ctx.lineTo(11,7);ctx.stroke();
  } else {
    oval(ctx,3,0,f.species==='wolf'?8:7,5,f.species==='snake'?'#b6bd84':'#d1bda0');
    oval(ctx,7,-1,2.3,1.8,'#292c30');
  }
  ctx.strokeStyle='#25262a';ctx.lineWidth=1;
  oval(ctx,-4,-9,1.7,2,'#f9e8ad');oval(ctx,6,-9,1.7,2,'#f9e8ad');
  ctx.fillStyle='#25262a';ctx.fillRect(-4,-10,1.3,2.8);ctx.fillRect(6,-10,1.3,2.8);
}
export function drawPuppet(ctx: Context, f: Fighter, time: number, scale: number): void {
  ctx.save();ctx.scale(scale,scale);ctx.strokeStyle='#24242a';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.lineCap='round';
  if(f.pose==='dead'||f.pose==='fallen'){ctx.rotate(Math.PI/2);ctx.translate(-15,0);ctx.globalAlpha=f.pose==='dead'?.55:1;}
  const facing = Math.cos(f.facing) < 0 ? -1 : 1;ctx.scale(facing,1);
  const moving=f.pose==='walk';const step=moving?Math.sin(time*12+Number(f.id.replace(/\D/g,'')))*.58:Math.sin(time*2)*.025;
  const strike=f.pose==='attack'?Math.sin(Math.max(0,Math.min(1,(f.poseUntil-time)/.5))*Math.PI)*1.8:0;
  const flinch=f.pose==='hit'?-.2:0;
  const fur=f.species==='snake'?'#80956c':f.species==='bear'?'#9a7656':'#b7aaa0';
  const limb=(color:string,length:number,width:number)=>(c:Context)=>{c.fillStyle=color;c.beginPath();c.roundRect(-width/2,0,width,length,4);c.fill();c.stroke();};
  const leg=(x:number,angle:number):Bone=>({x,y:-17,angle,paint:limb('#494652',12,8),children:[{x:0,y:10,angle:-angle*.65,paint:limb(fur,10,6),children:[{x:0,y:9,paint:c=>oval(c,2,1,6,3,'#423c39')}]}]});
  const arm=(x:number,angle:number,equipment:Weapon):Bone=>({x,y:-19,angle,paint:limb(fur,12,7),children:[{x:0,y:11,angle:-.35,paint:limb(fur,11,6),children:[{x:0,y:10,paint:c=>{oval(c,0,0,4,4,fur);drawWeapon(c,equipment);}}]}]});
  const torso:Bone={x:0,y:-14,angle:flinch,paint:c=>{polygon(c,[-11,-24,10,-24,13,-7,8,1,-8,1,-13,-7],f.color);c.fillStyle='#3f3b45';c.fillRect(-10,-5,21,6);c.fillStyle='#c7a869';c.fillRect(-2,-5,5,5);polygon(c,[-11,-24,-4,-26,-6,-15,-13,-14],'#b6a78b');},children:[arm(-12,step*.7,f.shield?'shield':'fists'),{x:0,y:-26,angle:step*.04,paint:c=>head(c,f)},arm(12,-step*.8-strike,f.weapon)]};
  bone(ctx,{x:0,y:moving?Math.abs(Math.sin(time*12))*2:0,children:[leg(-6,step),leg(6,-step),torso]});
  ctx.restore();
}
