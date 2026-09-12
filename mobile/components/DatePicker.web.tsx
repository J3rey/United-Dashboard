import { colors, fonts, numbers } from '../theme';
export function DatePicker({value,onChange}:{value:string;onChange:(date:string)=>void}) {
 return <input aria-label="Choose date" type="date" value={value} onChange={event=>{if(event.currentTarget.value)onChange(event.currentTarget.value);}} style={{boxSizing:'border-box',width:'100%',minHeight:48,marginTop:8,padding:12,border:`1px solid ${colors.border2}`,borderRadius:12,background:colors.surface,color:colors.ink,fontFamily:fonts.regular,fontSize:16,fontVariantNumeric:'tabular-nums'}}/>;
}
