import { Captions } from 'lucide-react';
import type { AppTab } from './BottomNavigation';
import { useI18n } from '../i18n';

interface ComingSoonViewProps {
  tab: Extract<AppTab, 'lyrics'>;
}

export function ComingSoonView(_: ComingSoonViewProps) {
  const { t } = useI18n();
  const Icon = Captions;

  return (
    <section className="coming-soon-view">
      <span className="coming-soon-icon" aria-hidden="true">
        <Icon size={32} />
      </span>
      <h2>{t('lyricsTitle')}</h2>
      <p>{t('lyricsDescription')}</p>
      <span className="phase-label">Phase 5</span>
    </section>
  );
}
