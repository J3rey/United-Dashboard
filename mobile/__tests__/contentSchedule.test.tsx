import { act, fireEvent, render, within } from '@testing-library/react-native';
import { ContentSchedule } from '../components/ContentSchedule';
import { blankContent } from '../lib/content';
import { dateLabel, dateString } from '../lib/format';
import type { ContentItem, Id } from '../lib/types';

const pillars = [{ id: 1, name: 'Reels', colorIdx: 0 }];
let mockFilter: Id | 'all' = 'all';

jest.mock('../components/IdeaCard', () => ({ ideaStyles: { badge: {}, badgeText: {} } }));
jest.mock('../components/ui', () => {
 const { Pressable, Text } = require('react-native');
 return {
  IconButton: ({ name, label, onPress }: { name: string; label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{name}</Text></Pressable>,
  ui: { gutter: {}, line: {}, card: {}, editRow: {}, flex: {} },
 };
});
jest.mock('../hooks/useAppData', () => ({ useData: () => ({ state: { pillars, contentFilter: mockFilter } }) }));
jest.mock('../components/sheets/ContentSheets', () => {
 const { View, Text, Pressable } = require('react-native');
 return {
  AddToDaySheet: ({ date, items, onClose, onNew }: { date: string; items: ContentItem[]; onClose: () => void; onNew: () => void }) =>
   <View><Text>{`Add to day sheet: ${date}`}</Text><Text>{`Unscheduled shown: ${items.length}`}</Text><Pressable onPress={onNew}><Text>Trigger new idea</Text></Pressable><Pressable onPress={onClose}><Text>Close add-to-day</Text></Pressable></View>,
  AddIdeaSheet: ({ filter, postDate, onClose }: { filter: Id | 'all'; postDate?: string; onClose: () => void }) =>
   <View><Text>{`New idea sheet: filter=${String(filter)} postDate=${postDate}`}</Text><Pressable onPress={onClose}><Text>Close new idea</Text></Pressable></View>,
 };
});

const item = (id: Id, idea: string, postDate: string, status: ContentItem['status'] = 'Idea'): ContentItem =>
 ({ id, idea, notes: '', pillarId: 1, status, ...blankContent, postDate });

beforeEach(() => { mockFilter = 'all'; });

test('defaults to today, showing items scheduled on today and the unscheduled count', async () => {
 const today = dateString();
 const items = [item(1, 'Scheduled today', today), item(2, 'Loose idea', ''), item(3, 'Old posted', '', 'Posted')];
 const screen = await render(<ContentSchedule items={items} onOpen={jest.fn()}/>);
 expect(screen.getByText(dateLabel(today, false))).toBeTruthy();
 expect(screen.getByText('Scheduled today')).toBeTruthy();
 // Unscheduled count excludes the posted item, leaving just the one loose idea.
 expect(within(screen.getByText('Unscheduled').parent!).getByText('1')).toBeTruthy();
});

test('tapping a card opens the idea', async () => {
 const today = dateString(), onOpen = jest.fn();
 const items = [item(1, 'Scheduled today', today)];
 const screen = await render(<ContentSchedule items={items} onOpen={onOpen}/>);
 await act(async () => { fireEvent.press(screen.getByLabelText('Open Scheduled today')); });
 expect(onOpen).toHaveBeenCalledWith(1);
});

test('Unscheduled row is collapsed by default and expands on tap', async () => {
 const items = [item(1, 'Loose idea', '')];
 const screen = await render(<ContentSchedule items={items} onOpen={jest.fn()}/>);
 expect(screen.queryByText('Loose idea')).toBeNull();
 await act(async () => { fireEvent.press(screen.getByText('Unscheduled')); });
 expect(screen.getByText('Loose idea')).toBeTruthy();
 await act(async () => { fireEvent.press(screen.getByText('Unscheduled')); });
 expect(screen.queryByText('Loose idea')).toBeNull();
});

test('Add to this day opens the add-to-day sheet for the selected date, then New idea swaps to the add-idea sheet with the same date and current filter', async () => {
 mockFilter = 1;
 const today = dateString();
 const items = [item(1, 'Loose idea', '')];
 const screen = await render(<ContentSchedule items={items} onOpen={jest.fn()}/>);
 await act(async () => { fireEvent.press(screen.getByText('Add to this day')); });
 expect(screen.getByText(`Add to day sheet: ${today}`)).toBeTruthy();
 expect(screen.getByText('Unscheduled shown: 1')).toBeTruthy();
 await act(async () => { fireEvent.press(screen.getByText('Trigger new idea')); });
 expect(screen.getByText(`New idea sheet: filter=1 postDate=${today}`)).toBeTruthy();
 expect(screen.queryByText(`Add to day sheet: ${today}`)).toBeNull();
});

test('Today jumps back to the current month and day after paging away', async () => {
 const today = dateString();
 const screen = await render(<ContentSchedule items={[]} onOpen={jest.fn()}/>);
 await act(async () => { fireEvent.press(screen.getByLabelText('Previous month')); });
 await act(async () => { fireEvent.press(screen.getByText('Today')); });
 expect(screen.getByText(dateLabel(today, false))).toBeTruthy();
});
