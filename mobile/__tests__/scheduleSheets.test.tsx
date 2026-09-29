import { act, fireEvent, render } from '@testing-library/react-native';
import { AddToDaySheet, PillarFilterSheet } from '../components/sheets/ContentSheets';
import { blankContent } from '../lib/content';
import type { ContentItem, Id } from '../lib/types';
import type { ReactNode } from 'react';

const mockEdit = jest.fn<Promise<boolean>, [Id, object]>();
const mockSetState = jest.fn<void, [(s: { pillars: unknown[]; contentFilter: Id | 'all' }) => unknown]>();
let mockFilter: Id | 'all' = 'all';
const pillars = [{ id: 1, name: 'Reels', colorIdx: 0 }, { id: 2, name: 'Threads', colorIdx: 1 }];

jest.mock('../components/IdeaCard', () => ({ ideaStyles: { badge: {}, badgeText: {} } }));
jest.mock('../hooks/useActions', () => ({ useActions: () => ({ editIdea: mockEdit, busy: false }) }));
jest.mock('../hooks/useAppData', () => ({ useData: () => ({ state: { pillars, contentFilter: mockFilter }, setState: mockSetState }) }));
jest.mock('../components/ui', () => {
 const { View, Text, Pressable } = require('react-native');
 return {
  Sheet: ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) => <View><Text>{title}</Text>{subtitle && <Text>{subtitle}</Text>}{children}</View>,
  Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <Pressable disabled={disabled} onPress={onPress}><Text>{label}</Text></Pressable>,
  Chip: ({ label, onPress, selected }: { label: string; onPress: () => void; selected?: boolean }) => <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}><Text>{label}</Text></Pressable>,
  ui: { card: {}, editRow: {}, flex: {}, wrap: {}, label: {} },
 };
});

const item = (id: Id, idea: string, pillarId: Id | null = 1): ContentItem => ({ id, idea, notes: '', pillarId, status: 'Idea', ...blankContent });

beforeEach(() => { mockEdit.mockReset().mockResolvedValue(true); mockSetState.mockReset(); mockFilter = 'all'; });

test('tapping an unscheduled idea sets its post date and closes', async () => {
 const close = jest.fn(), items = [item(1, 'DITL3'), item(2, 'Explore more')];
 const screen = await render(<AddToDaySheet date="2026-09-30" items={items} onClose={close} onNew={jest.fn()}/>);
 await act(async () => { fireEvent.press(screen.getByText('Explore more')); });
 expect(mockEdit).toHaveBeenCalledWith(2, { postDate: '2026-09-30' });
 expect(close).toHaveBeenCalledTimes(1);
});

test('empty unscheduled list shows fallback copy instead of rows', async () => {
 const screen = await render(<AddToDaySheet date="2026-09-30" items={[]} onClose={jest.fn()} onNew={jest.fn()}/>);
 expect(screen.getByText('Every idea has a date.')).toBeTruthy();
});

test('New idea for this day opens the add-idea flow without touching editIdea', async () => {
 const onNew = jest.fn();
 const screen = await render(<AddToDaySheet date="2026-09-30" items={[item(1, 'DITL3')]} onClose={jest.fn()} onNew={onNew}/>);
 await act(async () => { fireEvent.press(screen.getByText('New idea for this day')); });
 expect(onNew).toHaveBeenCalledTimes(1);
 expect(mockEdit).not.toHaveBeenCalled();
});

test('picking a pillar sets the content filter and closes', async () => {
 const close = jest.fn();
 const screen = await render(<PillarFilterSheet onClose={close}/>);
 await act(async () => { fireEvent.press(screen.getByText('Threads')); });
 expect(mockSetState).toHaveBeenCalledTimes(1);
 const updater = mockSetState.mock.calls[0]![0];
 expect(updater({ pillars, contentFilter: 'all' })).toEqual({ pillars, contentFilter: 2 });
 expect(close).toHaveBeenCalledTimes(1);
});

test('picking All resets the content filter', async () => {
 mockFilter = 2;
 const close = jest.fn();
 const screen = await render(<PillarFilterSheet onClose={close}/>);
 await act(async () => { fireEvent.press(screen.getByText('All')); });
 const updater = mockSetState.mock.calls[0]![0];
 expect(updater({ pillars, contentFilter: 2 })).toEqual({ pillars, contentFilter: 'all' });
});
