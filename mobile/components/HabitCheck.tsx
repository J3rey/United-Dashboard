import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { Icon } from './Icon';
import { colors } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
export function HabitCheck({state,label,disabled,onPress}:{state:'empty'|'checked'|'goal';label:string;disabled?:boolean;onPress:()=>void}) {
 const scale=useSharedValue(1), reduced=useReducedMotion(); const animated=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));
 return <Pressable accessibilityRole="checkbox" aria-checked={state!=='empty'} accessibilityLabel={label} accessibilityState={{checked:state!=='empty',disabled:Boolean(disabled)}} disabled={disabled} onPress={()=>{if(!reduced)scale.value=withSequence(withSpring(0.88,{duration:120}),withSpring(1,{duration:120}));onPress();}} style={styles.target}><Animated.View style={[styles.box,state==='checked'&&styles.checked,state==='goal'&&styles.goal,animated]}>{state!=='empty'&&<Icon name="check" size={20} color={state==='checked'?colors.surface:colors.moss}/>}</Animated.View></Pressable>;
}
const styles=StyleSheet.create({target:{width:44,minHeight:56,alignItems:'center',justifyContent:'center'},box:{width:30,height:30,borderRadius:10,borderWidth:1.8,borderColor:colors.border2,alignItems:'center',justifyContent:'center'},checked:{backgroundColor:colors.moss,borderColor:colors.moss},goal:{backgroundColor:colors.mossLight,borderColor:colors.mossLight}});
