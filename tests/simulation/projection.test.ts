import { describe, expect, it } from 'vitest';
import { createProjection, FORESHORTENING, insideArena, project, unproject } from '../../src/arena/projection';
describe('45 度競技場投影', () => {
  it('不同畫布尺寸都能把場地點反投影回世界座標', () => {
    for (const [width,height] of [[1200,700],[390,440]]) {
      const p=createProjection(width,height);
      for(const [x,y] of [[0,0],[4,-3],[-7,1]]) {
        const screen=project(x,y,p);const world=unproject(screen.x,screen.y,p);
        expect(world.x).toBeCloseTo(x);expect(world.y).toBeCloseTo(y);
      }
    }
  });
  it('視角壓縮不改變圓形碰撞邊界', () => {
    expect(FORESHORTENING).toBeCloseTo(Math.sin(Math.PI/4));
    expect(insideArena(0,7.5)).toBe(true);expect(insideArena(6,6)).toBe(false);
  });
});
