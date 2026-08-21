import { describe, expect, it } from 'vitest';
import {
  addLyricLine,
  batchShiftLyricLines,
  computeLyricProgress,
  convertSongLyricsChinese,
  createSongLyrics,
  exportToLrc,
  exportToSrt,
  exportToVtt,
  findLyrics,
  getLyricFrame,
  parseGenericLyrics,
  parseGroqTranscription,
  parseLrc,
  parsePlainText,
  parseSrt,
  parseVtt,
  removeLyricLine,
  resetLyricLinesToOriginal,
  updateLyricLine,
  upsertLyrics,
  EMPTY_LYRICS_LIBRARY,
} from './lyrics';

describe('lyrics parser', () => {
  it('parses line LRC and computes progressive fill', () => {
    const parsed = parseLrc('[00:10.00]第一句\n[00:14.00]第二句');
    expect(parsed.source).toBe('lrc');
    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0]).toMatchObject({ start: 10, end: 14, text: '第一句' });
    expect(computeLyricProgress(parsed.lines[0]!, 12)).toBeCloseTo(0.5);
    expect(getLyricFrame(parsed.lines, 12)).toMatchObject({ activeIndex: 0, progress: 0.5 });
  });

  it('parses enhanced LRC word timestamps', () => {
    const parsed = parseLrc('[00:10.00]<00:10.00>跟著<00:11.00>節奏\n[00:13.00]下一句');
    expect(parsed.source).toBe('enhanced-lrc');
    expect(parsed.lines[0]?.words).toHaveLength(2);
    expect(computeLyricProgress(parsed.lines[0]!, 11.5)).toBeGreaterThan(0.5);
  });

  it('parses SRT format with millisecond precision', () => {
    const srt = `1
00:00:10,500 --> 00:00:14,200
這是第一句歌詞

2
00:00:14,500 --> 00:00:18,000
這是第二句歌詞`;
    const parsed = parseSrt(srt);
    expect(parsed.source).toBe('srt');
    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0]?.start).toBe(10.5);
    expect(parsed.lines[0]?.end).toBe(14.2);
    expect(parsed.lines[0]?.text).toBe('這是第一句歌詞');
    expect(parsed.lines[1]?.start).toBe(14.5);
  });

  it('parses WebVTT format', () => {
    const vtt = `WEBVTT

00:00:05.100 --> 00:00:08.500
風中的花香

00:00:09.000 --> 00:00:12.300
帶走我的思念`;
    const parsed = parseVtt(vtt);
    expect(parsed.source).toBe('vtt');
    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0]?.start).toBe(5.1);
    expect(parsed.lines[0]?.end).toBe(8.5);
    expect(parsed.lines[0]?.text).toBe('風中的花香');
  });

  it('parses plain text and autodetects generic input', () => {
    const plain = '第一句歌詞\n第二句歌詞\n第三句歌詞';
    const parsed = parsePlainText(plain, 30);
    expect(parsed.source).toBe('manual');
    expect(parsed.lines).toHaveLength(3);

    const genericLrc = parseGenericLyrics('[00:05.00]LRC 測試');
    expect(genericLrc.source).toBe('lrc');

    const genericVtt = parseGenericLyrics('WEBVTT\n\n00:01.000 --> 00:04.000\nVTT 測試');
    expect(genericVtt.source).toBe('vtt');
  });

  it('converts Groq segment and word timestamps to karaoke lines', () => {
    const lines = parseGroqTranscription({
      segments: [{ start: 1, end: 3, text: '跟著節奏' }],
      words: [
        { word: '跟著', start: 1, end: 2 },
        { word: '節奏', start: 2, end: 3 },
      ],
    });
    expect(lines[0]).toMatchObject({ start: 1, text: '跟著節奏' });
    expect(lines[0]?.words).toHaveLength(2);
  });

  it('exports to LRC, SRT, and VTT formats', () => {
    const song = createSongLyrics({
      id: 'song-1',
      trackUrl: 'https://www.youtube.com/watch?v=abc',
      title: '測試歌曲',
      artist: '測試歌手',
      source: 'lrc',
      sourceLabel: 'test.lrc',
      lines: [
        { id: '1', text: '句一', start: 5, end: 8, words: [] },
        { id: '2', text: '句二', start: 10, end: 14, words: [] },
      ],
      now: 1000,
    });

    const lrcOut = exportToLrc(song);
    expect(lrcOut).toContain('[ti:測試歌曲]');
    expect(lrcOut).toContain('[00:05.00]句一');

    const srtOut = exportToSrt(song);
    expect(srtOut).toContain('00:00:05,000 --> 00:00:08,000');
    expect(srtOut).toContain('句一');

    const vttOut = exportToVtt(song);
    expect(vttOut).toContain('WEBVTT');
    expect(vttOut).toContain('00:00:05.000 --> 00:00:08.000');
  });

  it('handles line editing, batch shifting, and undo reset', () => {
    const song = createSongLyrics({
      id: 'song-edit',
      trackUrl: 'https://www.youtube.com/watch?v=edit',
      title: '編輯測試',
      artist: '歌手',
      source: 'lrc',
      sourceLabel: 'edit.lrc',
      lines: [
        { id: 'l1', text: '句一', start: 10, end: 15, words: [] },
        { id: 'l2', text: '句二', start: 20, end: 25, words: [] },
        { id: 'l3', text: '句三', start: 30, end: 35, words: [] },
      ],
      now: 1000,
    });

    // Update single line
    const updated = updateLyricLine(song, 'l2', { start: 21.5, text: '句二修正' });
    expect(updated.lines[1]?.start).toBe(21.5);
    expect(updated.lines[1]?.text).toBe('句二修正');

    // Batch shift from line 2
    const shifted = batchShiftLyricLines(song, 'l2', 2.0);
    expect(shifted.lines[0]?.start).toBe(10); // line 1 unchanged
    expect(shifted.lines[1]?.start).toBe(22); // 20 + 2
    expect(shifted.lines[2]?.start).toBe(32); // 30 + 2

    // Add and remove
    const added = addLyricLine(song, 'l1', '插入句', 16, 19);
    expect(added.lines).toHaveLength(4);
    expect(added.lines[1]?.text).toBe('插入句');

    const removed = removeLyricLine(added, 'l1');
    expect(removed.lines).toHaveLength(3);

    // Reset to original
    const reverted = resetLyricLinesToOriginal(updated);
    expect(reverted.lines[1]?.text).toBe('句二');
    expect(reverted.lines[1]?.start).toBe(20);
  });

  it('calculates lyric frame and lead time upcoming lines', () => {
    const lines = [
      { id: '1', text: '第一句', start: 10, end: 15, words: [] },
      { id: '2', text: '第二句', start: 20, end: 25, words: [] },
    ];

    // Before first line with lead time = 2.0s
    const frameAt7 = getLyricFrame(lines, 7, 2.0);
    expect(frameAt7.next).toBeNull(); // 7 < 10 - 2.0

    const frameAt8 = getLyricFrame(lines, 8, 2.0);
    expect(frameAt8.next?.text).toBe('第一句'); // 8 >= 10 - 2.0

    // During line 1
    const frameAt12 = getLyricFrame(lines, 12, 2.0);
    expect(frameAt12.current?.text).toBe('第一句');
    expect(frameAt12.next).toBeNull(); // 12 < 20 - 2.0

    const frameAt185 = getLyricFrame(lines, 18.5, 2.0);
    expect(frameAt185.current?.text).toBe('第一句');
    expect(frameAt185.next?.text).toBe('第二句'); // 18.5 >= 20 - 2.0
  });

  it('stores one lyric document per canonical song URL', () => {
    const entry = createSongLyrics({
      id: 'lyrics-1',
      trackUrl: 'https://www.youtube.com/watch?v=-ZRrhoFBM4s&list=example',
      title: '花香',
      artist: '許紹洋',
      source: 'lrc',
      sourceLabel: 'test.lrc',
      lines: parseLrc('[00:01.00]測試').lines,
      now: 100,
    });
    expect(entry.layoutMode).toBe('dock-bottom');
    expect(entry.dockHeightPercent).toBe(30);
    const library = upsertLyrics(EMPTY_LYRICS_LIBRARY, entry);
    expect(findLyrics(library, 'https://www.youtube.com/watch?v=-ZRrhoFBM4s')?.title).toBe('花香');
  });

  it('converts song lyrics between Simplified and Traditional Chinese', () => {
    const entry = createSongLyrics({
      id: 'lyrics-convert',
      trackUrl: 'https://www.youtube.com/watch?v=test',
      title: '测试',
      artist: '歌手',
      source: 'lrc',
      sourceLabel: 'test.lrc',
      lines: [
        { id: '1', start: 0, end: 5, text: '风吹过原野，带走忧伤', words: [{ start: 0, end: 2, text: '风吹' }] },
      ],
      now: 100,
    });

    const trad = convertSongLyricsChinese(entry, 'traditional');
    expect(trad.lines[0]?.text).toContain('風');
    expect(trad.lines[0]?.text).toContain('帶');
    expect(trad.lines[0]?.text).toContain('憂');
    expect(trad.lines[0]?.words[0]?.text).toContain('風');

    const simp = convertSongLyricsChinese(trad, 'simplified');
    expect(simp.lines[0]?.text).toContain('风');
    expect(simp.lines[0]?.text).toContain('带');
    expect(simp.lines[0]?.text).toContain('忧');
  });
});


