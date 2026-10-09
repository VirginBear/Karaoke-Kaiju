import { describe, expect, it } from 'vitest';
import {
  PATREON_URL,
  SUPPORT_EMAIL,
  SUPPORT_PAGE_URL,
  buildFeedbackEmailUrl,
  buildGitHubIssueUrl,
} from './support-links';

describe('support links', () => {
  it('uses the public support channels approved by the publisher', () => {
    expect(SUPPORT_EMAIL).toBe('94coarselover@gmail.com');
    expect(PATREON_URL).toBe('https://www.patreon.com/c/94uncle');
    expect(SUPPORT_PAGE_URL).toBe('https://virginbear.github.io/Karaoke-Kaiju/support.html');
  });

  it('creates a prefilled feedback email without silently attaching user data', () => {
    const url = new URL(buildFeedbackEmailUrl('0.1.0', 'zh-TW'));
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe(SUPPORT_EMAIL);
    expect(url.searchParams.get('subject')).toContain('Karaoke Kaiju 0.1.0');
    expect(url.searchParams.get('body')).toContain('Chrome 版本：');
    expect(url.searchParams.get('body')).toContain('重現步驟：');
    expect(url.searchParams.get('body')).not.toContain('youtube.com/watch');
  });

  it('routes structured bug reports to the repository issue form', () => {
    const url = new URL(buildGitHubIssueUrl());
    expect(url.origin + url.pathname).toBe('https://github.com/VirginBear/Karaoke-Kaiju/issues/new');
    expect(url.searchParams.get('template')).toBe('bug_report.yml');
  });
});
