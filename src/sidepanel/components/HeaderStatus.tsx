import { ChevronLeft, Radio, Settings } from 'lucide-react';
import { useI18n } from '../i18n';

export type AppTheme = 'light' | 'dark';

interface HeaderStatusProps {
  connected: boolean;
  processing: boolean;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
}

export function HeaderStatus({
  connected,
  processing,
  settingsOpen,
  onOpenSettings,
  onCloseSettings,
}: HeaderStatusProps) {
  const { t } = useI18n();
  if (settingsOpen) {
    return (
      <header className="app-header app-header--detail">
        <button className="header-icon-button" type="button" onClick={onCloseSettings} aria-label={t('back')}>
          <ChevronLeft size={24} />
        </button>
        <h1>{t('settings')}</h1>
        <span className="header-balance" aria-hidden="true" />
      </header>
    );
  }

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <img src="/brand/karaoke-kaiju-app-icon.svg" alt="" aria-hidden="true" />
        <span>{t('appName')}</span>
      </div>
      <div className="header-actions">
        <span className={`header-connection ${processing ? 'is-processing' : connected ? 'is-connected' : ''}`}>
          <Radio size={13} />
          {processing ? t('audioProcessing') : connected ? t('songFound') : t('waitingSong')}
        </span>
        <button className="header-icon-button" type="button" onClick={onOpenSettings} aria-label={t('openSettings')}>
          <Settings size={19} />
        </button>
      </div>
    </header>
  );
}
