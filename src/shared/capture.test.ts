import { describe, expect, it } from 'vitest';
import { describeCaptureError } from './capture';

describe('describeCaptureError', () => {
  it('把尚未叫用擴充功能的 Chrome 錯誤改成可操作指示', () => {
    expect(
      describeCaptureError(
        'Extension has not been invoked for the current page (see activeTab permission). Chrome pages cannot be captured.',
      ),
    ).toBe(
      '請在要練唱的 YouTube 分頁，點一次 Chrome 工具列或「擴充功能」拼圖選單中的「調唱」圖示來啟動音訊。',
    );
  });

  it('對 Chrome 內建頁面顯示明確限制', () => {
    expect(describeCaptureError('Chrome pages cannot be captured.')).toContain('Chrome 內建頁面');
  });
});
