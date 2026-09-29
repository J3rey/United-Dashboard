import { act, fireEvent, render } from '@testing-library/react-native';
import IdeaPage from '../app/(tabs)/content/[id]';
import { blankContent } from '../lib/content';
import type { ContentItem } from '../lib/types';
import type { ReactNode } from 'react';

const mockEdit = jest.fn<Promise<boolean>, [string | number, object]>();
const mockDeleteIdea = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockLoading = false;
let capturedBeforeRemove: (() => void) | undefined;
const mockAddListener = jest.fn((event: string, cb: () => void) => { if (event === 'beforeRemove') capturedBeforeRemove = cb; return jest.fn(); });
let mockContent: ContentItem[] = [];

jest.mock('expo-router', () => ({
 useLocalSearchParams: () => ({ id: '1' }),
 useNavigation: () => ({ addListener: mockAddListener }),
 useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack, push: jest.fn() }),
}));
jest.mock('../hooks/useAppData', () => ({ useData: () => ({ state: { get content() { return mockContent; }, pillars: [] }, loading: mockLoading }) }));
jest.mock('../hooks/useActions', () => ({ useActions: () => ({ editIdea: mockEdit, deleteIdea: mockDeleteIdea, busy: false }) }));
jest.mock('../components/sheets/ContentSheets', () => ({ StageSheet: () => null, PillarPickerSheet: () => null, PostDateSheet: () => null }));
jest.mock('../components/TabShell', () => {
 const { Fragment } = require('react');
 return { Page: ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => <Fragment>{actions}{children}</Fragment> };
});
jest.mock('../components/ui', () => {
 const { Text, Pressable } = require('react-native');
 return {
  Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <Pressable disabled={disabled} onPress={onPress}><Text>{label}</Text></Pressable>,
  Chip: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable onPress={onPress}><Text>{label}</Text></Pressable>,
  EditRow: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable onPress={onPress}><Text>{label}</Text></Pressable>,
  IconButton: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable>,
  Segmented: () => null,
  ui: { field: {}, label: {}, input: {}, gutter: {}, line: {}, flex: {}, card: {}, dim: {} },
 };
});
jest.mock('../components/Icon', () => ({ Icon: () => null }));
const mockAlert = jest.fn();
jest.mock('../lib/alert', () => ({ Alert: { alert: (...args: unknown[]) => mockAlert(...args) } }));

const item: ContentItem = { id: 1, idea: 'An idea', notes: '', pillarId: null, status: 'Idea', ...blankContent };
beforeEach(() => { mockEdit.mockReset().mockResolvedValue(true); mockDeleteIdea.mockReset(); mockBack.mockReset(); mockReplace.mockReset(); mockAlert.mockReset(); capturedBeforeRemove = undefined; mockContent = [item]; mockCanGoBack = true; mockLoading = false; });

test('blur commits only the changed field', async () => {
 const screen = await render(<IdeaPage/>);
 await fireEvent.changeText(screen.getByLabelText('Notes'), 'Draft');
 await act(async () => { fireEvent(screen.getByLabelText('Notes'), 'blur'); });
 expect(mockEdit).toHaveBeenCalledWith(1, { notes: 'Draft' });
});

test('leaving before a blur still commits the draft (beforeRemove safety net)', async () => {
 const screen = await render(<IdeaPage/>);
 await fireEvent.changeText(screen.getByLabelText('Notes'), 'Draft');
 expect(mockEdit).not.toHaveBeenCalled();
 await act(async () => { capturedBeforeRemove?.(); });
 expect(mockEdit).toHaveBeenCalledWith(1, { notes: 'Draft' });
});

test('delete handler only calls deleteIdea; navigation back is left to the missing-item effect', async () => {
 const screen = await render(<IdeaPage/>);
 await act(async () => { fireEvent.press(screen.getByLabelText('Delete idea')); });
 expect(mockAlert).toHaveBeenCalledTimes(1);
 const buttons = mockAlert.mock.calls[0]?.[2] as { text: string; onPress?: () => void }[];
 const confirm = buttons.find(b => b.text === 'Delete');
 await act(async () => { confirm?.onPress?.(); });
 expect(mockDeleteIdea).toHaveBeenCalledWith(1);
 expect(mockDeleteIdea).toHaveBeenCalledTimes(1);
 expect(mockBack).not.toHaveBeenCalled();
});

test('a missing item navigates back exactly once', async () => {
 mockContent = [];
 await act(async () => { render(<IdeaPage/>); });
 expect(mockBack).toHaveBeenCalledTimes(1);
});

test('does not navigate away while a refetch is loading, and does once it settles with the item still missing (M2c)', async () => {
 mockContent = [];
 mockLoading = true;
 const screen = await render(<IdeaPage/>);
 expect(mockBack).not.toHaveBeenCalled();
 mockLoading = false;
 await act(async () => { screen.rerender(<IdeaPage/>); });
 expect(mockBack).toHaveBeenCalledTimes(1);
});

test('falls back to replace when there is no back history for a missing item (M2a)', async () => {
 mockContent = [];
 mockCanGoBack = false;
 await act(async () => { render(<IdeaPage/>); });
 expect(mockBack).not.toHaveBeenCalled();
 expect(mockReplace).toHaveBeenCalledWith('/content');
});

test('deleting while mounted calls back once', async () => {
 const screen = await render(<IdeaPage/>);
 await act(async () => { fireEvent.press(screen.getByLabelText('Delete idea')); });
 const buttons = mockAlert.mock.calls[0]?.[2] as { text: string; onPress?: () => void }[];
 const confirm = buttons.find(b => b.text === 'Delete');
 await act(async () => { confirm?.onPress?.(); mockContent = []; screen.rerender(<IdeaPage/>); });
 expect(mockBack).toHaveBeenCalledTimes(1);
});

test('empty title reverts to the saved idea on blur and does not commit', async () => {
 const screen = await render(<IdeaPage/>);
 await fireEvent.changeText(screen.getByLabelText('The idea'), '   ');
 await act(async () => { fireEvent(screen.getByLabelText('The idea'), 'blur'); });
 expect(screen.getByLabelText('The idea').props.value).toBe('An idea');
 expect(mockEdit).not.toHaveBeenCalled();
});

test('title is trimmed before it is committed', async () => {
 const screen = await render(<IdeaPage/>);
 await fireEvent.changeText(screen.getByLabelText('The idea'), '  New idea  ');
 await act(async () => { fireEvent(screen.getByLabelText('The idea'), 'blur'); });
 expect(mockEdit).toHaveBeenCalledWith(1, { idea: 'New idea' });
});

test('Mark as merges dirty text with the status change into one write (I1)', async () => {
 const screen = await render(<IdeaPage/>);
 await fireEvent.changeText(screen.getByLabelText('Notes'), 'Draft');
 // Deliberately not blurred: the bug this guards against only shows up while text is still dirty.
 await act(async () => { fireEvent.press(screen.getByText('Mark as scripted')); });
 expect(mockEdit).toHaveBeenCalledTimes(1);
 expect(mockEdit).toHaveBeenCalledWith(1, { notes: 'Draft', status: 'Scripted' });
});

test('a write in flight never drops a later commit (I2 concurrency)', async () => {
 // Mimics the real useActions busy gate: a second call made while one is still pending is refused.
 let busy = false, release: ((v: boolean) => void) | undefined;
 mockEdit.mockImplementation(() => {
  if (busy) return Promise.resolve(false);
  busy = true;
  return new Promise<boolean>(resolve => { release = v => { busy = false; resolve(v); }; });
 });
 const screen = await render(<IdeaPage/>);
 await fireEvent.changeText(screen.getByLabelText('Notes'), 'Draft notes');
 await act(async () => { fireEvent(screen.getByLabelText('Notes'), 'blur'); }); // starts the first, still-pending write
 expect(mockEdit).toHaveBeenCalledTimes(1);
 await fireEvent.changeText(screen.getByLabelText('Script'), 'Draft script');
 await act(async () => { capturedBeforeRemove?.(); }); // queues behind the pending write instead of racing it
 expect(mockEdit).toHaveBeenCalledTimes(1);
 await act(async () => { release?.(true); for (let i = 0; i < 5; i++) await Promise.resolve(); });
 expect(mockEdit).toHaveBeenCalledTimes(2);
 expect(mockEdit.mock.calls[1]?.[1]).toMatchObject({ script: 'Draft script' });
 release?.(true);
});
