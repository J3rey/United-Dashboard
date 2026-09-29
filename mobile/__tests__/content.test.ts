import { blankContent, contentChangesToRow, itemsOn, mergePipelineOrder, monthGrid, refHost, refHref, rowToContent, unscheduled } from '../lib/content';
import type { ContentItem, ContentRow } from '../lib/types';
const item=(id:number,status:ContentItem['status']='Idea',postDate=''):ContentItem=>({id,status,idea:String(id),notes:'',pillarId:null,...blankContent,postDate});
test('dragging active ideas preserves posted rows and the entire order',()=>{
 const original=[item(1),item(2,'Posted'),item(3),item(4,'Posted'),item(5)];
 expect(mergePipelineOrder(original,[original[4]!,original[0]!,original[2]!]).map(x=>x.id)).toEqual([5,2,1,4,3]);
});
test('rowToContent maps snake columns and null to empty strings',()=>{
 const row:ContentRow={id:7,user_id:'u',idea:'Waves',pillar_id:3,status:'Scripted',notes:null,sort_order:0,post_date:'2026-09-23',ref_url:null,twist:'t',orig_script:null,script:'s'};
 expect(rowToContent(row)).toEqual({id:7,idea:'Waves',pillarId:3,status:'Scripted',notes:'',postDate:'2026-09-23',refUrl:'',twist:'t',origScript:'',script:'s'});
});
test('contentChangesToRow maps only present keys and empty new fields to null',()=>{
 expect(contentChangesToRow({postDate:'',script:'Hook'})).toEqual({post_date:null,script:'Hook'});
 expect(contentChangesToRow({notes:'',pillarId:null,idea:'X',status:'Idea'})).toEqual({notes:'',pillar_id:null,idea:'X',status:'Idea'});
 expect(contentChangesToRow({refUrl:'a',twist:'',origScript:'o'})).toEqual({ref_url:'a',twist:null,orig_script:'o'});
 expect(contentChangesToRow({})).toEqual({});
});
test('monthGrid pads Sep 2026 (starts Tuesday) to whole Sunday-start weeks',()=>{
 const g=monthGrid(2026,8);
 expect(g).toHaveLength(35);expect(g[0]).toBe('2026-08-30');expect(g[2]).toBe('2026-09-01');expect(g[34]).toBe('2026-10-03');
});
test('monthGrid for a Sunday-start month and leap February',()=>{
 const nov=monthGrid(2026,10);expect(nov[0]).toBe('2026-11-01');expect(nov).toHaveLength(35);
 const feb=monthGrid(2028,1);expect(feb).toContain('2028-02-29');expect(feb[0]).toBe('2028-01-30');expect(feb.length%7).toBe(0);
});
test('refHref and refHost accept http(s) and bare hosts only',()=>{
 expect(refHref('instagram.com/reel/abc')).toBe('https://instagram.com/reel/abc');
 expect(refHost('https://www.tiktok.com/@x/video/1')).toBe('tiktok.com');
 expect(refHref('javascript:alert(1)')).toBe('');
 expect(refHref('has space.com')).toBe('');
 expect(refHref('')).toBe('');expect(refHost('ftp://x.com')).toBe('');
});
test('itemsOn keeps order and unscheduled excludes posted and dated items',()=>{
 const rows=[item(1,'Idea','2026-09-30'),item(2,'Idea'),item(3,'Posted'),item(4,'Edited','2026-09-30'),item(5,'Scripted')];
 expect(itemsOn(rows,'2026-09-30').map(x=>x.id)).toEqual([1,4]);
 expect(unscheduled(rows).map(x=>x.id)).toEqual([2,5]);
});
