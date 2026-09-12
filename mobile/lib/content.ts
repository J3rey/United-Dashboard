import { colors } from '../theme';
import type { ContentItem, ContentStatus } from './types';
export const stages:ContentStatus[]=['Idea','Scripted','Filmed','Edited','Posted'];
export const stageColors:Record<ContentStatus,{bg:string;text:string}>={Idea:{bg:colors.surface2,text:colors.ink2},Scripted:{bg:colors.blueLight,text:colors.blue},Filmed:{bg:colors.purpleLight,text:colors.purple},Edited:{bg:colors.amberLight,text:colors.amber},Posted:{bg:colors.greenLight,text:colors.green}};
export function mergePipelineOrder(original:ContentItem[],ordered:ContentItem[]) {let index=0;return original.map(row=>row.status==='Posted'?row:ordered[index++]??row);}
