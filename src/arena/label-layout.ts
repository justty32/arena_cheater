/** Screen-space name/resource blocks. Pure presentation: no fighter hitboxes. */
export interface LabelAnchor { id: string; x: number; y: number; width: number; height: number; priority?: number }
export interface LabelBounds { width: number; height: number }
export interface PlacedLabel extends LabelAnchor { displaced: boolean; fallback: boolean }
type Offset = { x: number; y: number; clearSince?: number };
const GAP = 3;
const MARGIN = 6;
function overlap(a: LabelAnchor, b: LabelAnchor): number {
  return Math.max(0, Math.min(a.x+a.width+GAP,b.x+b.width)-Math.max(a.x-GAP,b.x)) *
    Math.max(0, Math.min(a.y+a.height+GAP,b.y+b.height)-Math.max(a.y-GAP,b.y));
}
export class LabelLayout {
  private offsets = new Map<string, Offset>();
  private bounds?: LabelBounds;
  private lastTime = -Infinity;
  reset(): void { this.offsets.clear(); this.bounds=undefined; this.lastTime=-Infinity; }
  arrange(labels: readonly LabelAnchor[], bounds: LabelBounds, time: number, obstacles: readonly LabelAnchor[] = []): PlacedLabel[] {
    if (this.bounds?.width!==bounds.width || this.bounds?.height!==bounds.height || time<this.lastTime) this.reset();
    this.bounds={...bounds}; this.lastTime=time;
    const placed: PlacedLabel[]=[];
    const ids=new Set(labels.map(label=>label.id));
    for(const id of this.offsets.keys()) if(!ids.has(id))this.offsets.delete(id);
    for(const label of [...labels].sort((a,b)=>(a.priority??0)-(b.priority??0)||a.id.localeCompare(b.id))){
      const fit=(offset:Offset):LabelAnchor=>({...label,
        x:Math.max(MARGIN,Math.min(bounds.width-MARGIN-label.width,label.x+offset.x)),
        y:Math.max(MARGIN,Math.min(bounds.height-MARGIN-label.height,label.y+offset.y))});
      const penalty=(rect:LabelAnchor)=>[...placed,...obstacles].reduce((sum,other)=>sum+overlap(rect,other),0);
      const origin=fit({x:0,y:0});
      const previous=this.offsets.get(label.id);
      let clearSince:number|undefined;
      let chosen:LabelAnchor|undefined;
      if(previous && penalty(fit(previous))===0){
        chosen=fit(previous);
        if(penalty(origin)===0){
          clearSince=previous.clearSince??time;
          if(time-clearSince>=.3)chosen=origin;
        }
      }
      if(!chosen){
        const step=label.height+GAP+1,side=label.width+8;
        const candidates:Offset[]=[{x:0,y:0}];
        for(const row of [-1,-2,-3])candidates.push({x:0,y:row*step});
        for(const x of [-side/2,side/2,-side,side])for(const row of [-1,0,-2,1,2])candidates.push({x,y:row*step});
        for(const row of [1,2,3])candidates.push({x:0,y:row*step});
        const distance=(rect:LabelAnchor)=>(rect.x-origin.x)**2+(rect.y-origin.y)**2;
        const rects=candidates.map(fit).sort((a,b)=>distance(a)-distance(b));
        chosen=rects.find(rect=>penalty(rect)===0)??rects.reduce((best,rect)=>penalty(rect)<penalty(best)?rect:best);
      }
      const displaced=Math.abs(chosen.x-label.x)>.5||Math.abs(chosen.y-label.y)>.5;
      const fallback=penalty(chosen)>0 || chosen.x+chosen.width>bounds.width-MARGIN || chosen.y+chosen.height>bounds.height-MARGIN;
      this.offsets.set(label.id,{x:chosen.x-label.x,y:chosen.y-label.y,clearSince:displaced?clearSince:undefined});
      placed.push({...chosen,displaced,fallback});
    }
    return placed;
  }
}
