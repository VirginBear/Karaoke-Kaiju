import { describe, expect, it } from 'vitest';
import { matchKeyboardShortcut } from './shortcuts';

describe('shortcuts', () => {
  it('matches pitch up/down with bracket keys', () => {
    expect(matchKeyboardShortcut({ key: '[' })).toEqual({ type: 'PITCH_DELTA', semitones: -1 });
    expect(matchKeyboardShortcut({ key: ']' })).toEqual({ type: 'PITCH_DELTA', semitones: 1 });
    expect(matchKeyboardShortcut({ key: '\\' })).toEqual({ type: 'PITCH_RESET' });
  });

  it('matches Alt-modified loop and cents shortcuts', () => {
    expect(matchKeyboardShortcut({ key: 'a', altKey: true })).toEqual({ type: 'LOOP_ACTION', action: 'set-a' });
    expect(matchKeyboardShortcut({ key: 'b', altKey: true })).toEqual({ type: 'LOOP_ACTION', action: 'set-b' });
    expect(matchKeyboardShortcut({ key: 'l', altKey: true })).toEqual({ type: 'LOOP_ACTION', action: 'toggle' });
    expect(matchKeyboardShortcut({ key: 'c', altKey: true })).toEqual({ type: 'LOOP_ACTION', action: 'clear' });
    expect(matchKeyboardShortcut({ key: ']', altKey: true })).toEqual({ type: 'CENTS_DELTA', cents: 5 });
    expect(matchKeyboardShortcut({ key: '[', altKey: true })).toEqual({ type: 'CENTS_DELTA', cents: -5 });
  });

  it('ignores shortcuts when input target is editable', () => {
    const mockEditable = { isContentEditable: true };
    expect(matchKeyboardShortcut({ key: '[', target: mockEditable })).toBeNull();

    const mockInput = { matches: (s: string) => s.includes('input') };
    expect(matchKeyboardShortcut({ key: ']', target: mockInput })).toBeNull();
  });

  it('handles panel focused arrow and space shortcuts', () => {
    expect(matchKeyboardShortcut({ key: ' ', code: 'Space' }, { panelFocused: true })).toEqual({ type: 'PLAYBACK_TOGGLE' });
    expect(matchKeyboardShortcut({ key: 'ArrowUp' }, { panelFocused: true })).toEqual({ type: 'PITCH_DELTA', semitones: 1 });
    expect(matchKeyboardShortcut({ key: 'ArrowDown' }, { panelFocused: true })).toEqual({ type: 'PITCH_DELTA', semitones: -1 });
    expect(matchKeyboardShortcut({ key: 'ArrowLeft' }, { panelFocused: true, seekInterval: 5 })).toEqual({ type: 'SEEK_DELTA', seconds: -5 });
  });
});
