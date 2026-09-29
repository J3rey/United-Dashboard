import { act, fireEvent, render } from '@testing-library/react-native';
import IdeaPage from '../app/(tabs)/content/[id]';
import { blankContent } from '../lib/content';
import type { ContentItem } from '../lib/types';
import type { ReactNode } from 'react';

const mockEdit = jest.fn<Promise<boolean>, [string | number, object]>();
const mockDeleteIdea = jest.fn();
const mockBack = jest.fn();
let capturedBeforeRemove: (() => void) | undefined;
const mockAddListener = jest.fn((event: string, cb: () => void) => { if (event === 'beforeRemove') capturedBeforeRemove = cb; return jest.fn(); });
let mockContent: ContentItem[] = [];

jest.mock('expo-router', () => ({
 useLocalSearchParams: () => ({ id: '1' }),
 useNavigation: () => ({ addListener: mockAddListener }),
 useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));
jest.mock('../hooks/useAppData', () => ({ useData: () => ({ state: { get content() { return mockContent; }, pillars: [] } }) }));
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
beforeEach(() => { mockEdit.mockReset().mockResolvedValue(true); mockDeleteIdea.mockReset(); mockBack.mockReset(); mockAlert.mockReset(); capturedBeforeRemove = undefined; mockContent = [item]; });

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
