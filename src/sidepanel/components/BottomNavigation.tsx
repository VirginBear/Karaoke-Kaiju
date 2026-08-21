import { AudioLines, Captions, Clock3, ListMusic } from 'lucide-react';
import { useI18n } from '../i18n';

export type AppTab = 'practice' | 'recent' | 'playlists' | 'lyrics';

interface BottomNavigationProps {
  selected: AppTab;
  onSelect: (tab: AppTab) => void;
}

export function BottomNavigation({ selected, onSelect }: BottomNavigationProps) {
  const { t } = useI18n();
  const items = [
    { id: 'practice' as const, label: t('navPractice'), Icon: AudioLines },
    { id: 'recent' as const, label: t('navRecent'), Icon: Clock3 },
    { id: 'playlists' as const, label: t('navPlaylists'), Icon: ListMusic },
    { id: 'lyrics' as const, label: t('navLyrics'), Icon: Captions },
  ];
  return (
    <nav className="bottom-nav" aria-label={t('mainNavigation')}>
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={selected === id ? 'is-selected' : ''}
          onClick={() => onSelect(id)}
          aria-current={selected === id ? 'page' : undefined}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
