import type { ColorValue } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme';
export type IconName = 'wallet' | 'check' | 'film' | 'gear' | 'back' | 'chevron' | 'out' | 'swap' | 'archive' | 'info' | 'plus' | 'close' | 'inbox' | 'filter' | 'chart' | 'grip' | 'flag' | 'trash';
export function Icon({ name, color = colors.ink2, size = 22 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden>
    {name === 'plus' && <Path d="M12 5v14M5 12h14"/>}
    {name === 'close' && <Path d="m6 6 12 12M6 18 18 6"/>}
    {name === 'inbox' && <><Path d="M3 12h5l2 3h4l2-3h5M3 12l3-8h12l3 8v8H3z"/></>}
    {name === 'filter' && <Path d="M3 4h18l-7 8v7l-4 2v-9z"/>}
    {name === 'chart' && <Path d="M4 3v17h17M8 16v-4m5 4V8m5 8V4"/>}
    {name === 'grip' && <Path d="M8 5h.1M16 5h.1M8 12h.1M16 12h.1M8 19h.1M16 19h.1" strokeWidth={4}/>}
    {name === 'flag' && <Path d="M5 22V3h14l-3 5 3 5H5"/>}
    {name === 'trash' && <Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>}
    {name === 'wallet' && <><Path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6" /><Path d="M20 12h-5v4h5" /><Circle cx={17} cy={14} r={0.5}/></>}
    {name === 'check' && <><Circle cx={12} cy={12} r={9}/><Path d="m8 12 3 3 5-6"/></>}
    {name === 'film' && <><Rect x={3} y={3} width={18} height={18} rx={2}/><Path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/></>}
    {name === 'gear' && <><Path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 2 3-1 1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-2z"/><Circle cx={12} cy={12} r={3}/></>}
    {name === 'back' && <Path d="m15 5-7 7 7 7"/>}
    {name === 'chevron' && <Path d="m9 6 6 6-6 6"/>}
    {name === 'out' && <><Path d="M9 4H4v16h5m5-12 4 4-4 4M8 12h10"/></>}
    {name === 'swap' && <Path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>}
    {name === 'archive' && <><Rect x={3} y={3} width={18} height={4} rx={1}/><Path d="M5 7v14h14V7m-10 5h6"/></>}
    {name === 'info' && <><Circle cx={12} cy={12} r={9}/><Path d="M12 11v6m0-10v.1"/></>}
  </Svg>;
}
