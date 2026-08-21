export function describeCaptureError(message: string | undefined): string {
  const normalized = message?.toLowerCase() ?? '';

  if (normalized.includes('extension has not been invoked')) {
    return '請在要練唱的 YouTube 分頁，點一次 Chrome 工具列或「擴充功能」拼圖選單中的「調唱」圖示來啟動音訊。';
  }

  if (normalized.includes('chrome pages cannot be captured')) {
    return 'Chrome 內建頁面無法擷取音訊。請回到 YouTube 分頁再點擊「調唱」圖示。';
  }

  return message || 'Chrome 無法取得目前分頁的音訊串流';
}
