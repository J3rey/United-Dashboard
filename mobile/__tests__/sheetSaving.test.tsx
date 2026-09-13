import { act, fireEvent, render } from '@testing-library/react-native';
import { IdeaDetailSheet } from '../components/sheets/ContentSheets';
import { ExpenseDetailSheet } from '../components/sheets/ExpenseSheets';
import { HabitActionsSheet } from '../components/sheets/HabitSheets';
import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';
jest.mock('../components/sheets/PillarSheet', () => ({ PillarSheet: () => null }));
const mockEdit = jest.fn<Promise<boolean>, [string | number, object]>();
jest.mock('../hooks/useActions', () => ({ useActions: () => ({ editIdea: mockEdit, editExpense: mockEdit, editHabit: mockEdit, busy: false }) }));
jest.mock('../hooks/useAppData', () => ({ useData: () => ({ state: { pillars: [] } }) }));
jest.mock('../hooks/usePrefs', () => ({ usePrefs: () => ({}) }));
jest.mock('../components/ui', () => {
 const { View, Text, TextInput, Pressable } = require('react-native');
 return {
  Sheet: ({ children, onClose, confirmClose }: { children: ReactNode; onClose: () => void; confirmClose?: (close: () => void) => void }) => <View>{children}<Pressable onPress={() => confirmClose ? confirmClose(onClose) : onClose()}><Text>Dismiss sheet</Text></Pressable></View>,
  Field: ({ label, ...props }: TextInputProps & { label: string }) => <TextInput accessibilityLabel={label} {...props}/>,
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable onPress={onPress}><Text>{label}</Text></Pressable>,
  EditRow: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable onPress={onPress}><Text>{label}</Text></Pressable>,
  Chip: () => null, IconButton: () => null, Categories: () => null, DateField: () => null,
  ui: { line: {}, flex: {} },
 };
});
const item = { id: 1, idea: 'An idea', notes: '', pillarId: null, status: 'Posted' as const };
beforeEach(() => mockEdit.mockReset().mockResolvedValue(true));
test('Done saves focused notes before closing, without blur', async () => {
 const close = jest.fn(), screen = await render(<IdeaDetailSheet item={item} onClose={close}/>);
 await fireEvent.changeText(screen.getByLabelText('Notes · optional'), 'Draft');
 await act(async () => fireEvent.press(screen.getByText('Done')));
 expect(mockEdit).toHaveBeenCalledWith(1, { notes: 'Draft' });
 expect(close).toHaveBeenCalledTimes(1);
});
test('gesture/header dismissal saves notes and stays open on failure', async () => {
 mockEdit.mockResolvedValue(false);
 const close = jest.fn(), screen = await render(<IdeaDetailSheet item={item} onClose={close}/>);
 await fireEvent.changeText(screen.getByLabelText('Notes · optional'), 'Draft');
 await act(async () => fireEvent.press(screen.getByText('Dismiss sheet')));
 expect(mockEdit).toHaveBeenCalledWith(1, { notes: 'Draft' });
 expect(close).not.toHaveBeenCalled();
});
test('Done waits for an existing blur save without duplicating it', async () => {
 let resolve!: (saved: boolean) => void;
 mockEdit.mockReturnValue(new Promise<boolean>(done => { resolve = done; }));
 const close = jest.fn(), screen = await render(<IdeaDetailSheet item={item} onClose={close}/>);
 await fireEvent.changeText(screen.getByLabelText('Notes · optional'), 'Draft');
 await fireEvent(screen.getByLabelText('Notes · optional'), 'blur');
 await fireEvent.press(screen.getByText('Done'));
 expect(close).not.toHaveBeenCalled();
 await act(async () => resolve(true));
 expect(mockEdit).toHaveBeenCalledTimes(1);
 expect(close).toHaveBeenCalledTimes(1);
});
test('Done saves a focused expense amount', async () => {
 const close = jest.fn(), screen = await render(<ExpenseDetailSheet expense={{ id: 2, cost: 5, detail: 'Coffee', person: '', type: 'normal', cat: 'Food', date: '2026-09-12' }} onClose={close}/>);
 await fireEvent.press(screen.getByText('Amount'));
 await fireEvent.changeText(screen.getByLabelText('Amount'), '12.50');
 await act(async () => fireEvent.press(screen.getByText('Done')));
 expect(mockEdit).toHaveBeenCalledWith(2, { cost: 12.5 });
 expect(close).toHaveBeenCalledTimes(1);
});
test('dismissal saves a focused habit rename', async () => {
 const close = jest.fn(), screen = await render(<HabitActionsSheet habit={{ id: 3, name: 'Run', goal: 3, daily: false, type: 'weekly' }} count={0} onClose={close}/>);
 await fireEvent.press(screen.getByText('Rename'));
 await fireEvent.changeText(screen.getByLabelText('Rename'), 'Jog');
 await act(async () => fireEvent.press(screen.getByText('Dismiss sheet')));
 expect(mockEdit).toHaveBeenCalledWith(3, { name: 'Jog' });
 expect(close).toHaveBeenCalledTimes(1);
});
