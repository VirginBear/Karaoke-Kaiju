import { describe, expect, it } from 'vitest';
import { toSimplified, toTraditional, detectChineseVariant } from './chinese-convert';

describe('chinese-convert', () => {
  it('converts Simplified Chinese lyrics to Traditional Chinese', () => {
    const input = '风吹过原野，带走回忆与忧伤，我们在歌声中相聚';
    const output = toTraditional(input);
    expect(output).toContain('風');
    expect(output).toContain('帶');
    expect(output).toContain('憂');
    expect(output).toContain('聲');
  });

  it('converts Traditional Chinese lyrics to Simplified Chinese', () => {
    const input = '風吹過原野，帶走回憶與憂傷，我們在歌聲中相聚';
    const output = toSimplified(input);
    expect(output).toContain('风');
    expect(output).toContain('带');
    expect(output).toContain('忧');
    expect(output).toContain('声');
  });

  it('preserves non-Chinese characters and timestamps', () => {
    const input = '[01:23.45] Hello World! 123 唱歌 (La La)';
    expect(toTraditional(input)).toBe('[01:23.45] Hello World! 123 唱歌 (La La)');
    expect(toSimplified(input)).toBe('[01:23.45] Hello World! 123 唱歌 (La La)');
  });

  it('detects Chinese character variants', () => {
    expect(detectChineseVariant('風帶走憂傷')).toBe('traditional');
    expect(detectChineseVariant('风带走忧伤')).toBe('simplified');
    expect(detectChineseVariant('Hello 123')).toBe('none');
  });
});
