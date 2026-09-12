import { convert } from '../lib/converter';
test('AUD-based stored rates convert in both directions',()=>{expect(convert(120,'AUD','IDR')).toBe(1224000);expect(convert(1224000,'IDR','AUD')).toBe(120);expect(convert(100,'USD','EUR')).toBeCloseTo(92.1875);});
test('zero and same-currency conversion stay exact',()=>{expect(convert(0,'AUD','USD')).toBe(0);expect(convert(10.25,'EUR','EUR')).toBe(10.25);});
