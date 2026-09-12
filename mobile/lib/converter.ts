import { RATES, type Currency } from './constants';
export function convert(amount:number,from:Currency,to:Currency) {return amount/RATES[from]*RATES[to];}
