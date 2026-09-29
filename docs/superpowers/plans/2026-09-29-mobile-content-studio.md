# Mobile Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Expo app's Content tab up to the web Content studio (post date, reference reel + twist, original vs my-draft script, schedule) with mobile-native screens.

**Architecture:** Data fields and pure helpers land in `mobile/lib/content.ts` and flow through the existing `db.ts` → `useAppData` → `useActions.editIdea` path; no new state plumbing. UI adds a full-screen idea route (`app/(tabs)/content/[id].tsx`), a schedule component (`components/ContentSchedule.tsx`), and a few sheets in `components/sheets/ContentSheets.tsx`.

**Tech Stack:** Expo SDK 57, expo-router (typed routes ON), React Native 0.86, @gorhom/bottom-sheet, TypeScript strict, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-09-29-mobile-content-studio-design.md` — read it; it is the contract. Mockups: https://claude.ai/artifact/4YoSDyZSaACKyDEh3Z3yJy

## Global Constraints

- Only files under `mobile/` change (plus this plan's checkboxes). Web app untouched. No new dependencies.
- No DB/schema change. Columns `post_date`, `ref_url`, `twist`, `orig_script`, `script` already exist, nullable.
- App value `''` ↔ DB `NULL` for the five new fields.
- Dates: local only — use `dateString()` from `mobile/lib/format.ts`; never `toISOString()`.
- Match the surrounding code style: dense one-line JSX/TS as in `app/(tabs)/content/index.tsx` and `components/sheets/ContentSheets.tsx`; reuse `ui`, `colors`, `type`, `numbers`, `fonts` from `components/ui.tsx` / `theme.ts`; no comments beyond the existing density.
- Touch targets ≥ 44pt. Tabular numbers (`numbers`) on dates/counts.
- Commands run from `mobile/`: `npm run typecheck`, `npm test`.
- Typed routes: after creating `app/(tabs)/content/[id].tsx`, regenerate `.expo/types/router.d.ts` by starting Metro once: `(CI=1 npx expo start --port 8099 >/tmp/expo-types.log 2>&1 &) ; sleep 25 ; pkill -f "expo start --port 8099"`, then re-run typecheck. Do not cast routes to silence the checker.
- Don't weaken or delete existing tests. Commit at the end of each task with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` as the last line.

---

### Task 1: Data layer — fields, mappers, schedule helpers

**Files:**
- Modify: `mobile/lib/types.ts` (`ContentItem`, `ContentRow`, `ContentChanges`)
- Modify: `mobile/lib/content.ts`
- Modify: `mobile/lib/db.ts` (`fetchContent`, `insertContentItem`, `updateContentItem`, ~lines 214–258)
- Modify: `mobile/lib/defaultState.ts` (content array, ~lines 62–76)
- Modify: `mobile/components/sheets/ContentSheets.tsx` (only the `actions.saveIdea({...})` call in `AddIdeaSheet`, so it type-checks)
- Test: `mobile/__tests__/content.test.ts`

**Interfaces:**
- Produces:
  - `ContentItem = { id; idea; pillarId; status; notes; postDate: string; refUrl: string; twist: string; origScript: string; script: string }`
  - `ContentChanges = Partial<Pick<ContentItem,'idea'|'pillarId'|'status'|'notes'|'postDate'|'refUrl'|'twist'|'origScript'|'script'>>`
  - `export type ContentRow` (now exported) with `post_date|ref_url|twist|orig_script|script: string | null`
  - `rowToContent(row: ContentRow): ContentItem`
  - `contentChangesToRow(changes: ContentChanges): Partial<ContentRow>`
  - `monthGrid(year: number, month: number): string[]` (month 0-based; ISO dates, Sunday start, whole weeks)
  - `refHref(url: string): string` / `refHost(url: string): string` (`''` when invalid)
  - `itemsOn(items: ContentItem[], iso: string): ContentItem[]`
  - `unscheduled(items: ContentItem[]): ContentItem[]`
  - `blankContent = { postDate:'', refUrl:'', twist:'', origScript:'', script:'' }` (spread into new items)

- [ ] **Step 1: Write the failing tests** — replace `mobile/__tests__/content.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest __tests__/content.test.ts`
Expected: FAIL (exports like `rowToContent` / `blankContent` not found; type errors are fine at this stage).

- [ ] **Step 3: Update types** in `mobile/lib/types.ts`:

```ts
export type ContentItem = { id: Id; idea: string; pillarId: Id | null; status: ContentStatus; notes: string; postDate: string; refUrl: string; twist: string; origScript: string; script: string };
export type ContentRow = { id: Id; user_id: string; idea: string; pillar_id: Id | null; status: ContentStatus; notes: string | null; sort_order: number; post_date: string | null; ref_url: string | null; twist: string | null; orig_script: string | null; script: string | null };
export type ContentChanges = Partial<Pick<ContentItem, 'idea' | 'pillarId' | 'status' | 'notes' | 'postDate' | 'refUrl' | 'twist' | 'origScript' | 'script'>>;
```
(Replace the existing non-exported `type ContentRow` and the existing `ContentItem` / `ContentChanges` lines.)

- [ ] **Step 4: Implement helpers** — append to `mobile/lib/content.ts` (keep existing exports; change the type import to include `ContentChanges, ContentRow`):

```ts
import { dateString } from './format';
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
```
Note: `new URL('instagram.com')`-style bare input is handled by the `https://` prefix. If `new Date(year, month, 1-lead+i)` crosses DST it still lands on the right calendar day because `dateString` reads local fields.

- [ ] **Step 5: Wire db.ts** — in `mobile/lib/db.ts` import `{ rowToContent, contentChangesToRow }` from `'./content'`, then:

```ts
  const content = (itemsData ?? []).map(rowToContent)
```
```ts
    .insert({ user_id: userId, sort_order: sortOrder, ...contentChangesToRow(item) })
```
```ts
export async function updateContentItem(id: Id, changes: ContentChanges) {
  const { error } = await supabase.from('content_items').update(contentChangesToRow(changes)).eq('id', id)
  if (error) throw error
}
```
Check `lib/content.ts` does not import anything that imports `db.ts` (it imports `theme` and `format` only) — no cycle.

- [ ] **Step 6: Demo data** — replace the `content:` array in `mobile/lib/defaultState.ts` with the web one from `src/state/defaultState.js` lines 60–72 (same ids, same `postDate/refUrl/twist/origScript/script` values; note id 10 is `status: 'Scripted'` there). Keep the file's existing formatting style.

- [ ] **Step 7: Keep AddIdeaSheet compiling** — in `components/sheets/ContentSheets.tsx` `AddIdeaSheet`, change the save call to spread `blankContent` (import it from `'../../lib/content'`):

```ts
actions.saveIdea({idea:idea.trim(),notes:notes.trim(),pillarId,status:'Idea',...blankContent})
```

- [ ] **Step 8: Verify**

Run: `cd mobile && npx jest __tests__/content.test.ts && npm run typecheck && npm test`
Expected: all PASS; typecheck clean. Fix any other `ContentItem` literal the checker flags by spreading `blankContent` (don't loosen the type).

- [ ] **Step 9: Commit**

```bash
git add mobile/lib mobile/__tests__/content.test.ts mobile/components/sheets/ContentSheets.tsx
git commit -m "feat(mobile/content): load and save post date, reference and script fields"
```

---

### Task 2: Idea page route + card meta row

**Files:**
- Create: `mobile/app/(tabs)/content/[id].tsx`
- Modify: `mobile/components/Icon.tsx` (add `calendar`, `external`, `down`)
- Modify: `mobile/components/IdeaCard.tsx` (meta row)
- Modify: `mobile/components/sheets/ContentSheets.tsx` (delete `IdeaDetailSheet`; `export` `StageSheet`; add `PillarPickerSheet`, `PostDateSheet`)
- Modify: `mobile/app/(tabs)/content/index.tsx` (card `onPress` pushes the route; remove `detailId` state, `detail` lookup and `IdeaDetailSheet` render/import)

**Interfaces:**
- Consumes (Task 1): `ContentItem` new fields, `ContentChanges`, `refHref`, `refHost`, `stages`, `stageColors` from `lib/content.ts`; `actions.editIdea(id, changes): Promise<boolean>`, `actions.deleteIdea(id): void`, `actions.busy`.
- Produces:
  - `IconName` gains `'calendar' | 'external' | 'down'`
  - `export function StageSheet({value,onSelect,onClose}:{value:ContentStatus;onSelect:(s:ContentStatus)=>void;onClose:()=>void})`
  - `export function PillarPickerSheet({value,onSelect,onClose}:{value:Id|null;onSelect:(id:Id)=>void;onClose:()=>void})`
  - `export function PostDateSheet({value,title,onSet,onClose}:{value:string;title:string;onSet:(date:string)=>void;onClose:()=>void})` — `value` is `''` or ISO; `onSet('')` = clear
  - Route `/content/[id]` (`router.push({pathname:'/content/[id]',params:{id:String(item.id)}})`)

- [ ] **Step 1: Icons** — in `Icon.tsx` extend `IconName` and add:

```tsx
    {name === 'calendar' && <><Rect x={3} y={5} width={18} height={16} rx={2}/><Path d="M3 10h18M8 3v4m8-4v4"/></>}
    {name === 'external' && <Path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>}
    {name === 'down' && <Path d="m6 9 6 6 6-6"/>}
```

- [ ] **Step 2: Card meta row** — in `IdeaCard.tsx`, after the badges `View` and before notes, render when `item.postDate||item.refUrl||item.script`:

```tsx
{Boolean(item.postDate||item.refUrl||item.script)&&<View style={ui.line}>{Boolean(item.postDate)&&<><Icon name="calendar" size={14}/><Text style={[type.subtitle,numbers]}>{dateLabel(item.postDate)}</Text></>}<View style={ui.flex}/>{Boolean(item.refUrl)&&<Text style={styles.tag}>REF</Text>}{Boolean(item.script)&&<Text style={styles.tag}>SCR</Text>}</View>}
```
Add to the stylesheet: `tag:{fontFamily:fonts.semibold,fontSize:10,letterSpacing:0.6,color:colors.ink2,borderWidth:1,borderColor:colors.border2,borderRadius:6,paddingHorizontal:6,paddingVertical:2,overflow:'hidden'}`. Imports: `Icon` from `'./Icon'`, `dateLabel` from `'../lib/format'`. Use `ui.line` gap (9) — acceptable.

- [ ] **Step 3: Sheets** — in `ContentSheets.tsx`: delete `IdeaDetailSheet` entirely (and now-unused imports), prefix `StageSheet` with `export`, add:

```tsx
export function PillarPickerSheet({value,onSelect,onClose}:{value:Id|null;onSelect:(id:Id)=>void;onClose:()=>void}) {return <Sheet title="Pillar" onClose={onClose}><PillarChips value={value} onChange={onSelect}/></Sheet>;}
export function PostDateSheet({value,title,onSet,onClose}:{value:string;title:string;onSet:(date:string)=>void;onClose:()=>void}) {
 const [date,setDate]=useState(value||dateString());
 return <Sheet title="Post date" subtitle={title} onClose={onClose}><DatePicker value={date} onChange={setDate}/><Button label={`Set ${dateLabel(date,false)}`} onPress={()=>onSet(date)}/>{Boolean(value)&&<Button label="Clear date" tone="danger" onPress={()=>onSet('')}/>}</Sheet>;
}
```
Imports: `DatePicker` from `'../DatePicker'`, `dateLabel, dateString` from `'../../lib/format'`.

- [ ] **Step 4: Idea page** — create `mobile/app/(tabs)/content/[id].tsx`:

```tsx
import { Alert } from '../../../lib/alert';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Page } from '../../../components/TabShell';
import { Button, Chip, EditRow, IconButton, ui } from '../../../components/ui';
import { Icon } from '../../../components/Icon';
import { PillarPickerSheet, PostDateSheet, StageSheet } from '../../../components/sheets/ContentSheets';
import { useData } from '../../../hooks/useAppData';
import { useActions } from '../../../hooks/useActions';
import { PILLAR_COLORS } from '../../../lib/constants';
import { refHost, refHref, stageColors, stages } from '../../../lib/content';
import { dateLabel } from '../../../lib/format';
import type { ContentChanges, ContentItem } from '../../../lib/types';
import { colors, fonts, numbers, type } from '../../../theme';
type Draft = Pick<ContentItem,'idea'|'notes'|'refUrl'|'twist'|'origScript'|'script'>;
const draftOf=(c:ContentItem):Draft=>({idea:c.idea,notes:c.notes,refUrl:c.refUrl,twist:c.twist,origScript:c.origScript,script:c.script});
function Input({label,...props}:TextInputProps&{label:string}) {return <View style={ui.field}><Text style={ui.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.ink3} selectionColor={colors.moss} style={[ui.input,props.multiline&&{textAlignVertical:'top'},props.style]}/></View>;}
export default function IdeaPage(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),navigation=useNavigation(),data=useData(),actions=useActions();
 const item=data.state.content.find(c=>String(c.id)===id);
 const [draft,setDraft]=useState<Draft|null>(item?draftOf(item):null),[showRef,setShowRef]=useState(Boolean(item&&(item.refUrl||item.twist||item.origScript))),[version,setVersion]=useState<'orig'|'mine'>('mine'),[sheet,setSheet]=useState<'stage'|'pillar'|'date'|null>(null);
 const draftRef=useRef(draft),itemRef=useRef(item);draftRef.current=draft;itemRef.current=item;
 function commit(){const c=itemRef.current,d=draftRef.current;if(!c||!d)return;const changes:ContentChanges={};(Object.keys(d) as (keyof Draft)[]).forEach(k=>{const v=k==='idea'?d.idea.trim():d[k];if(k==='idea'&&!v)return;if(v!==c[k])changes[k]=v;});if(Object.keys(changes).length)void actions.editIdea(c.id,changes);}
 useEffect(()=>navigation.addListener('beforeRemove',commit),[navigation]);
 useEffect(()=>{if(!item)router.back();},[item,router]);
 if(!item||!draft)return null;
 const field=(k:keyof Draft)=>({value:draft[k],onChangeText:(v:string)=>setDraft(d=>d&&{...d,[k]:v}),onBlur:()=>{if(k==='idea'&&!draft.idea.trim())setDraft(d=>d&&{...d,idea:item.idea});commit();}});
 const index=stages.indexOf(item.status),next=stages[index+1],stage=stageColors[item.status],pillar=data.state.pillars.find(p=>p.id===item.pillarId),href=refHref(draft.refUrl);
 const remove=()=>Alert.alert('Delete idea?','You can undo this for four seconds.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>actions.deleteIdea(item.id)}]);
 return <Page title="Idea" back actions={<IconButton name="trash" label="Delete idea" onPress={remove}/>}>
 <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={[ui.gutter,{paddingBottom:40}]}>
  <TextInput accessibilityLabel="The idea" multiline {...field('idea')} selectionColor={colors.moss} style={{fontFamily:fonts.semibold,fontSize:22,letterSpacing:-0.4,color:colors.ink,paddingVertical:4,marginBottom:8}}/>
  <View style={[ui.line,{gap:4,marginBottom:10}]}>{stages.map((s,i)=><View key={s} style={{height:5,flex:1,borderRadius:3,backgroundColor:i<=index?stage.text:colors.border}}/>)}</View>
  <View style={[ui.line,{marginBottom:16}]}><Chip label={`${item.status} ⌄`} selected color={stage.text} onPress={()=>setSheet('stage')}/></View>
  <View style={[ui.card,{paddingHorizontal:14}]}><EditRow label="Pillar" value={pillar?.name??'No pillar'} onPress={()=>setSheet('pillar')}/><EditRow label="Post date" value={item.postDate?dateLabel(item.postDate,false):'None'} onPress={()=>setSheet('date')}/></View>
  <Input label="Notes" multiline placeholder="Anything to remember…" style={{minHeight:72}} {...field('notes')}/>
  {showRef?<>
   <Text style={[type.body,{fontFamily:fonts.semibold,fontSize:15,marginTop:10,marginBottom:10}]}>Reference reel</Text>
   <Input label="Link" autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="Paste Instagram / TikTok link" {...field('refUrl')}/>
   {Boolean(href)&&<View style={[ui.line,{marginTop:-6,marginBottom:12}]}><Text style={[type.subtitle,ui.flex]}>{refHost(draft.refUrl)}</Text><Pressable accessibilityRole="link" accessibilityLabel="Open reference reel" onPress={()=>{void Linking.openURL(href);}} style={({pressed})=>[ui.line,{minHeight:44,paddingHorizontal:14,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:5},pressed&&ui.dim]}><Text style={{fontFamily:fonts.semibold,fontSize:13,color:colors.moss}}>Open</Text><Icon name="external" size={15} color={colors.moss}/></Pressable></View>}
   <Input label="The twist · how mine differs" multiline placeholder="What am I changing? Audience, stakes, metaphor, ending…" style={{minHeight:80}} {...field('twist')}/>
  </>:<Pressable accessibilityRole="button" onPress={()=>setShowRef(true)} style={({pressed})=>[{minHeight:56,borderWidth:1.5,borderStyle:'dashed',borderColor:colors.border2,borderRadius:13,alignItems:'center',justifyContent:'center',paddingVertical:10,marginVertical:8},pressed&&ui.dim]}><Text style={{fontFamily:fonts.semibold,fontSize:14,color:colors.moss}}>+ Add a reference reel</Text><Text style={type.subtitle}>Unlocks original vs my draft</Text></Pressable>}
  <Text style={[type.body,{fontFamily:fonts.semibold,fontSize:15,marginTop:14,marginBottom:10}]}>Script</Text>
  {showRef&&<Segmented value={version} onChange={setVersion} options={[['orig','Original'],['mine','My draft']]}/>}
  {showRef&&version==='orig'?<Input key="orig" label="Original (their transcript)" multiline placeholder="Paste what they say…" style={{minHeight:260,lineHeight:22}} {...field('origScript')}/>:<Input key="mine" label={showRef?'My draft':'Script'} multiline placeholder="Hook, beats, close…" style={{minHeight:260,lineHeight:22}} {...field('script')}/>}
  {next&&<Button label={`Mark as ${next.toLowerCase()}`} disabled={actions.busy} onPress={()=>{commit();void actions.editIdea(item.id,{status:next});}}/>}
 </ScrollView>
 {sheet==='stage'&&<StageSheet value={item.status} onClose={()=>setSheet(null)} onSelect={async status=>{if(await actions.editIdea(item.id,{status}))setSheet(null);}}/>}
 {sheet==='pillar'&&<PillarPickerSheet value={item.pillarId} onClose={()=>setSheet(null)} onSelect={async pillarId=>{if(await actions.editIdea(item.id,{pillarId}))setSheet(null);}}/>}
 {sheet==='date'&&<PostDateSheet value={item.postDate} title={item.idea} onClose={()=>setSheet(null)} onSet={async postDate=>{if(await actions.editIdea(item.id,{postDate}))setSheet(null);}}/>}
 </Page>;
}
function Segmented<T extends string>({value,onChange,options}:{value:T;onChange:(v:T)=>void;options:[T,string][]}) {return <View accessibilityRole="tablist" style={{flexDirection:'row',backgroundColor:colors.border,borderRadius:12,padding:3,gap:3,marginBottom:12}}>{options.map(([v,label])=><Pressable key={v} accessibilityRole="tab" accessibilityState={{selected:v===value}} onPress={()=>onChange(v)} style={{flex:1,minHeight:38,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:v===value?colors.surface:colors.transparent}}><Text style={{fontFamily:fonts.medium,fontSize:13.5,color:v===value?colors.ink:colors.ink2}}>{label}</Text></Pressable>)}</View>;}
```
Notes for the implementer:
- `ui.field`/`ui.label`/`ui.input` exist in `components/ui.tsx`. `Chip`, `EditRow`, `Button`, `IconButton` are there too.
- The `Segmented` control is needed again in Task 3 for List | Schedule. **Move it to `components/ui.tsx` and export it there** instead of keeping it in this file (Task 3 imports `Segmented` from `components/ui`).
- `commit` on `beforeRemove` covers Back, swipe-back and tab re-press; blur covers normal edits. The `version` switch uses `key` so the textarea remounts cleanly; the other version's draft is kept in `draft`.
- If the item disappears (deleted here or elsewhere) the effect navigates back — so the delete handler must NOT also call `router.back()` (that would pop twice). After deletion `itemRef.current` is undefined, so the `beforeRemove` commit is a no-op.

- [ ] **Step 5: List pushes the route** — in `app/(tabs)/content/index.tsx`: remove `detailId` state, the `detail` constant, the `IdeaDetailSheet` import and its render. The `card` helper's `onPress` becomes:

```tsx
onPress={()=>router.push({pathname:'/content/[id]',params:{id:String(item.id)}})}
```

- [ ] **Step 6: Regenerate route types and verify**

Run (from `mobile/`): the typed-route regen command from Global Constraints, then `npm run typecheck && npm test`
Expected: clean typecheck, all tests pass.

- [ ] **Step 7: iOS bundle sanity**

Run: `cd mobile && npx expo export --platform ios --output-dir /tmp/mcs-ios-export`
Expected: export completes without errors. (Delete `/tmp/mcs-ios-export` after.)

- [ ] **Step 8: Commit**

```bash
git add mobile/app mobile/components
git commit -m "feat(mobile/content): full-screen idea page with reference reel and script"
```

---

### Task 3: Schedule view

**Files:**
- Create: `mobile/components/ContentSchedule.tsx`
- Modify: `mobile/components/sheets/ContentSheets.tsx` (`AddIdeaSheet` optional `postDate`; add `AddToDaySheet`, `PillarFilterSheet`)
- Modify: `mobile/app/(tabs)/content/index.tsx` (List | Schedule toggle, schedule header actions, render schedule)

**Interfaces:**
- Consumes: Task 1 `monthGrid`, `itemsOn`, `unscheduled`, `stageColors`; Task 2 `Segmented` (from `components/ui`), `Icon` names `down`, `chevron`, `plus`, `filter`; `dateLabel`, `dateString`, `monthLabel` from `lib/format`; `actions.editIdea`.
- Produces:
  - `export function ContentSchedule({items,onOpen}:{items:ContentItem[];onOpen:(id:Id)=>void})` — `items` already pillar-filtered
  - `export function AddToDaySheet({date,items,onClose,onNew}:{date:string;items:ContentItem[];onClose:()=>void;onNew:()=>void})` — `items` = filtered unscheduled
  - `export function PillarFilterSheet({onClose}:{onClose:()=>void})`
  - `AddIdeaSheet({filter,postDate,onClose}:{filter:Id|'all';postDate?:string;onClose:()=>void})`

- [ ] **Step 1: Sheets** — in `ContentSheets.tsx`:
  - `AddIdeaSheet` gains optional `postDate?: string`; pass `subtitle={postDate?`For ${dateLabel(postDate,false)}`:undefined}` to its `Sheet`; saves with `...blankContent,postDate:postDate??''`.
  - Add:

```tsx
export function AddToDaySheet({date,items,onClose,onNew}:{date:string;items:ContentItem[];onClose:()=>void;onNew:()=>void}) {
 const data=useData(),actions=useActions();
 return <Sheet title={`Add to ${dateLabel(date,false)}`} subtitle="Pick an unscheduled idea, or start a new one." onClose={onClose}>
  {items.length?<View style={[ui.card,{marginBottom:8}]}>{items.map(c=>{const p=data.state.pillars.find(x=>x.id===c.pillarId),color=p?(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text:colors.border2,stage=stageColors[c.status];return <Pressable key={c.id} accessibilityRole="button" disabled={actions.busy} onPress={async()=>{if(await actions.editIdea(c.id,{postDate:date}))onClose();}} style={({pressed})=>[ui.editRow,{paddingHorizontal:14,backgroundColor:pressed?colors.surface2:colors.surface}]}><View style={{width:9,height:9,borderRadius:5,backgroundColor:color}}/><View style={ui.flex}><Text style={type.body}>{c.idea}</Text><Text style={type.subtitle}>{p?.name??'No pillar'}</Text></View><View style={[ideaStyles.badge,{backgroundColor:stage.bg}]}><Text style={[ideaStyles.badgeText,{color:stage.text}]}>{c.status}</Text></View></Pressable>;})}</View>:<Text style={[type.subtitle,{marginBottom:12}]}>Every idea has a date.</Text>}
  <Button label="New idea for this day" tone="quiet" onPress={onNew}/>
 </Sheet>;
}
export function PillarFilterSheet({onClose}:{onClose:()=>void}) {
 const data=useData(),filter=data.state.contentFilter,pick=(id:Id|'all')=>{data.setState(s=>({...s,contentFilter:id}));onClose();};
 return <Sheet title="Filter by pillar" onClose={onClose}><View style={[ui.wrap,{marginBottom:14}]}><Chip label="All" selected={filter==='all'} onPress={()=>pick('all')}/>{data.state.pillars.map(p=><Chip key={p.id} label={p.name} color={(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text} selected={filter===p.id} onPress={()=>pick(p.id)}/>)}</View></Sheet>;
}
```
(`ideaStyles` is exported from `components/IdeaCard.tsx`.)

- [ ] **Step 2: ContentSchedule** — create `mobile/components/ContentSchedule.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../hooks/useAppData';
import { PILLAR_COLORS } from '../lib/constants';
import { itemsOn, monthGrid, stageColors, unscheduled } from '../lib/content';
import { dateLabel, dateString } from '../lib/format';
import type { ContentItem, Id } from '../lib/types';
import { colors, fonts, numbers, type } from '../theme';
import { Icon } from './Icon';
import { ideaStyles } from './IdeaCard';
import { IconButton, ui } from './ui';
import { AddIdeaSheet, AddToDaySheet } from './sheets/ContentSheets';
const DOW=['S','M','T','W','T','F','S'];
export function ContentSchedule({items,onOpen}:{items:ContentItem[];onOpen:(id:Id)=>void}) {
 const data=useData(),today=dateString(),[selected,setSelected]=useState(today),[ym,setYm]=useState({year:Number(today.slice(0,4)),month:Number(today.slice(5,7))-1}),[openUnscheduled,setOpenUnscheduled]=useState(false),[sheet,setSheet]=useState<'add'|'new'|null>(null);
 const colorOf=(c:ContentItem)=>{const p=data.state.pillars.find(x=>x.id===c.pillarId);return p?(PILLAR_COLORS[p.colorIdx]??PILLAR_COLORS[0]!).text:colors.border2;};
 const grid=useMemo(()=>monthGrid(ym.year,ym.month),[ym]),dayItems=itemsOn(items,selected),loose=unscheduled(items);
 const shift=(delta:number)=>setYm(({year,month})=>{const d=new Date(year,month+delta,1);return {year:d.getFullYear(),month:d.getMonth()};});
 const select=(iso:string)=>{setSelected(iso);setYm({year:Number(iso.slice(0,4)),month:Number(iso.slice(5,7))-1});};
 const row=(c:ContentItem)=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`Open ${c.idea}`} onPress={()=>onOpen(c.id)} style={({pressed})=>[ui.editRow,{paddingHorizontal:14,backgroundColor:pressed?colors.surface2:colors.surface}]}><View style={{width:8,height:8,borderRadius:4,backgroundColor:colorOf(c)}}/><Text style={[type.body,ui.flex]} numberOfLines={1}>{c.idea}</Text><View style={[ideaStyles.badge,{backgroundColor:stageColors[c.status].bg}]}><Text style={[ideaStyles.badgeText,{color:stageColors[c.status].text}]}>{c.status}</Text></View><Icon name="chevron" size={16} color={colors.ink3}/></Pressable>;
 const monthName=new Date(ym.year,ym.month,1).toLocaleDateString('en-AU',{month:'long'});
 return <View style={ui.gutter}>
  <View style={[ui.line,{gap:2}]}><Text style={[ui.flex,{fontFamily:fonts.bold,fontSize:20,letterSpacing:-0.5,color:colors.ink}]}>{monthName} <Text style={{fontFamily:fonts.regular,color:colors.ink3}}>{ym.year}</Text></Text><IconButton name="back" label="Previous month" onPress={()=>shift(-1)}/><IconButton name="chevron" label="Next month" onPress={()=>shift(1)}/><Pressable accessibilityRole="button" onPress={()=>select(today)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:10}}><Text style={{fontFamily:fonts.semibold,fontSize:13.5,color:colors.moss}}>Today</Text></Pressable></View>
  <View style={{flexDirection:'row',paddingVertical:4}}>{DOW.map((d,i)=><Text key={i} style={[type.label,{flex:1,textAlign:'center'}]}>{d}</Text>)}</View>
  <View style={{flexDirection:'row',flexWrap:'wrap'}}>{grid.map(iso=>{const out=Number(iso.slice(5,7))-1!==ym.month,on=itemsOn(items,iso),isSel=iso===selected,isToday=iso===today;return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={`${dateLabel(iso,false)}, ${on.length} ${on.length===1?'idea':'ideas'}`} accessibilityState={{selected:isSel}} onPress={()=>select(iso)} style={{width:`${100/7}%`,height:50,alignItems:'center',paddingTop:4,gap:4}}><View style={{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:isSel?colors.moss:colors.transparent,borderWidth:isToday&&!isSel?1.5:0,borderColor:colors.moss}}><Text style={[numbers,{fontFamily:isSel||isToday?fonts.semibold:fonts.medium,fontSize:14,color:isSel?colors.surface:isToday?colors.moss:out?colors.border2:colors.ink}]}>{Number(iso.slice(8))}</Text></View><View style={[ui.line,{gap:3,height:6}]}>{on.slice(0,3).map(c=><View key={c.id} style={{width:6,height:6,borderRadius:3,...(c.status==='Posted'?{borderWidth:1.5,borderColor:colorOf(c)}:{backgroundColor:colorOf(c)})}}/>)}{on.length>3&&<Text style={[numbers,{fontFamily:fonts.semibold,fontSize:9,lineHeight:9,color:colors.ink2}]}>+{on.length-3}</Text>}</View></Pressable>;})}</View>
  <View style={[ui.line,{marginTop:14,marginBottom:10,alignItems:'baseline'}]}><Text style={{fontFamily:fonts.semibold,fontSize:15,color:colors.ink}}>{dateLabel(selected,false)}</Text><Text style={[type.subtitle,numbers]}>{dayItems.length} {dayItems.length===1?'idea':'ideas'}</Text></View>
  <View style={ui.card}>{dayItems.map(row)}<Pressable accessibilityRole="button" onPress={()=>setSheet('add')} style={({pressed})=>[ui.editRow,{paddingHorizontal:14,borderBottomWidth:0,backgroundColor:pressed?colors.surface2:colors.surface}]}><Icon name="plus" size={18} color={colors.moss}/><Text style={{fontFamily:fonts.semibold,fontSize:14,color:colors.moss}}>Add to this day</Text></Pressable></View>
  <View style={ui.card}><Pressable accessibilityRole="button" accessibilityState={{expanded:openUnscheduled}} onPress={()=>setOpenUnscheduled(!openUnscheduled)} style={[ui.editRow,{paddingHorizontal:14,borderBottomWidth:openUnscheduled&&loose.length?undefined:0}]}><Text style={[type.body,ui.flex]}>Unscheduled</Text><Text style={[type.subtitle,numbers]}>{loose.length}</Text><View style={{transform:[{rotate:openUnscheduled?'180deg':'0deg'}]}}><Icon name="down" size={16} color={colors.ink3}/></View></Pressable>{openUnscheduled&&loose.map(row)}</View>
  {sheet==='add'&&<AddToDaySheet date={selected} items={loose} onClose={()=>setSheet(null)} onNew={()=>setSheet('new')}/>}
  {sheet==='new'&&<AddIdeaSheet filter={data.state.contentFilter} postDate={selected} onClose={()=>setSheet(null)}/>}
 </View>;
}
```
Notes: the last row inside each `ui.card` drops its hairline via `borderBottomWidth:0`; `ui.card` already clips corners. `IconButton name="back"` is the left chevron.

- [ ] **Step 3: Wire into the Content screen** — in `app/(tabs)/content/index.tsx`:
  - state: `const [view,setView]=useState<'list'|'schedule'>('list'),[filterSheet,setFilterSheet]=useState(false);`
  - header actions when not reordering: in schedule view render `<IconButton name="filter" label="Filter by pillar" onPress={()=>setFilterSheet(true)}/>` instead of the grip button; keep the pillars (`film`) button.
  - right under the `Page` header (not in reorder mode), render `<View style={ui.gutter}><Segmented value={view} onChange={setView} options={[['list','List'],['schedule','Schedule']]}/></View>` only when `content.length>0`.
  - `view==='schedule'`: render, instead of chips + FlatList + Fab, the existing `selected` "N ideas in <pillar> · Clear" line (if a filter is active) followed by
    ```tsx
    <ScrollView contentContainerStyle={{paddingBottom:30}} refreshControl={<RefreshControl refreshing={false} onRefresh={data.refetch} tintColor={colors.moss}/>}><ContentSchedule items={filtered} onOpen={id=>router.push({pathname:'/content/[id]',params:{id:String(id)}})}/></ScrollView>
    ```
  - `{filterSheet&&<PillarFilterSheet onClose={()=>setFilterSheet(false)}/>}` next to the other sheets.
  - List view is otherwise unchanged.

- [ ] **Step 4: Verify**

Run: `cd mobile && npm run typecheck && npm test && npx expo export --platform ios --output-dir /tmp/mcs-ios-export`
Expected: all clean. Remove the export dir after.

- [ ] **Step 5: Commit**

```bash
git add mobile/app mobile/components
git commit -m "feat(mobile/content): schedule view with month grid and add-to-day sheet"
```

---

### Task 4: Visual pass (controller, not a subagent)

- [ ] Add a `mobile-web` entry to `.claude/launch.json` (`npm --prefix mobile run web`, port 8081) and open it with `preview_start`.
- [ ] Demo mode (not signed in), phone viewport 390×844: check List, Schedule, Add-to-day sheet, idea page with ref (life comes in waves) and without (KASA intro), post date sheet against the mockups. Flow: add idea for a day → appears in grid; open it → type script → back → reopen, text still there; SCR tag lit on the card.
- [ ] Fix defects found (small follow-up commit), re-run typecheck/tests.
