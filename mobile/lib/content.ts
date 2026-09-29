import { colors } from '../theme';
import type { ContentItem, ContentStatus, ContentChanges, ContentRow } from './types';
import { dateString } from './format';
export const stages:ContentStatus[]=['Idea','Scripted','Filmed','Edited','Posted'];
export const stageColors:Record<ContentStatus,{bg:string;text:string}>={Idea:{bg:colors.surface2,text:colors.ink2},Scripted:{bg:colors.blueLight,text:colors.blue},Filmed:{bg:colors.purpleLight,text:colors.purple},Edited:{bg:colors.amberLight,text:colors.amber},Posted:{bg:colors.greenLight,text:colors.green}};
export function mergePipelineOrder(original:ContentItem[],ordered:ContentItem[]) {let index=0;return original.map(row=>row.status==='Posted'?row:ordered[index++]??row);}
export const blankContent={postDate:'',refUrl:'',twist:'',origScript:'',script:''};
export function rowToContent(row:ContentRow):ContentItem {return {id:row.id,idea:row.idea,pillarId:row.pillar_id,status:row.status,notes:row.notes??'',postDate:row.post_date??'',refUrl:row.ref_url??'',twist:row.twist??'',origScript:row.orig_script??'',script:row.script??''};}
export function contentChangesToRow(changes:ContentChanges):Partial<ContentRow> {
 const row:Partial<ContentRow>={};
 if('idea' in changes)row.idea=changes.idea;
 if('pillarId' in changes)row.pillar_id=changes.pillarId;
 if('status' in changes)row.status=changes.status;
 if('notes' in changes)row.notes=changes.notes;
 if('postDate' in changes)row.post_date=changes.postDate||null;
 if('refUrl' in changes)row.ref_url=changes.refUrl||null;
 if('twist' in changes)row.twist=changes.twist||null;
 if('origScript' in changes)row.orig_script=changes.origScript||null;
 if('script' in changes)row.script=changes.script||null;
 return row;
}
export function monthGrid(year:number,month:number) {const lead=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate(),total=Math.ceil((lead+days)/7)*7;return Array.from({length:total},(_,i)=>dateString(new Date(year,month,1-lead+i)));}
function parseRef(url:string) {
 const raw=url.trim();if(!raw||/\s/.test(raw))return null;
 const href=/^[a-z][a-z0-9+.-]*:/i.test(raw)?raw:`https://${raw}`;
 let parsed:URL;try{parsed=new URL(href);}catch{return null;}
 if(parsed.protocol!=='http:'&&parsed.protocol!=='https:')return null;
 return {href,host:parsed.hostname.replace(/^www\./,'')};
}
export function refHref(url:string) {return parseRef(url)?.href??'';}
export function refHost(url:string) {return parseRef(url)?.host??'';}
export function itemsOn(items:ContentItem[],iso:string) {return items.filter(c=>c.postDate===iso);}
export function unscheduled(items:ContentItem[]) {return items.filter(c=>!c.postDate&&c.status!=='Posted');}
