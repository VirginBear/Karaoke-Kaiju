export const SUPPORT_EMAIL = '94coarselover@gmail.com';
export const PATREON_URL = 'https://www.patreon.com/c/94uncle';
export const SUPPORT_PAGE_URL = 'https://virginbear.github.io/Karaoke-Kaiju/support.html';
export const GITHUB_ISSUES_URL = 'https://github.com/VirginBear/Karaoke-Kaiju/issues';

export function buildFeedbackEmailUrl(version = '0.1.0', _locale = 'zh-TW'): string {
  const subject = `[意見回饋] Karaoke Kaiju ${version}`;
  const body = `問題或建議描述：\n\n重現步驟：\n1. \n2. \n3. \n\nChrome 版本：\n作業系統：\n`;
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
}

export function buildGitHubIssueUrl(template = 'bug_report.yml'): string {
  return `${GITHUB_ISSUES_URL}/new?template=${encodeURIComponent(template)}`;
}
