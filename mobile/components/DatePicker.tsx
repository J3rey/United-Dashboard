import DateTimePicker from '@react-native-community/datetimepicker';
import { dateString } from '../lib/format';
export function DatePicker({value,onChange}:{value:string;onChange:(date:string)=>void}) {
 return <DateTimePicker value={new Date(value+'T12:00:00')} mode="date" display="spinner" themeVariant="light" onChange={(_,date)=>{if(date)onChange(dateString(date));}}/>;
}
