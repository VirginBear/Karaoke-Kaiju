import {
  ChevronRight,
  Clock3,
  ListMusic,
  ListPlus,
  Music2,
  Play,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RecentTrack } from '../../shared/history';
import { formatSignedSemitones, formatTime } from '../../shared/audio';
import { getTrackThumbnailUrl, type PlaylistLibrary, type PlaylistTrack } from '../../shared/library';
import { useI18n } from '../i18n';

interface RecentViewProps {
  tracks: RecentTrack[];
  loaded: boolean;
  library: PlaylistLibrary;
  busy: boolean;
  onPlay: (track: RecentTrack) => void;
  onRemove: (trackId: string) => void;
  onCreatePlaylist: (name: string) => string;
  onAddTrack: (playlistId: string, track: PlaylistTrack) => void;
}

export function RecentView({
  tracks,
  loaded,
  library,
  busy,
  onPlay,
  onRemove,
  onCreatePlaylist,
  onAddTrack,
}: RecentViewProps) {
  const { locale, t } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [choosingTrack, setChoosingTrack] = useState<RecentTrack | null>(null);
  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return normalized
      ? tracks.filter((track) =>
          `${track.title} ${track.artist}`.toLocaleLowerCase(locale).includes(normalized),
        )
      : tracks;
  }, [locale, query, tracks]);

  const addTrack = (track: RecentTrack) => {
    if (library.playlists.length === 0) {
      const playlistId = onCreatePlaylist(locale === 'en' ? 'My Practice' : locale === 'ja' ? 'マイ練習' : locale === 'zh-CN' ? '我的练唱' : '我的練唱');
      onAddTrack(playlistId, track);
      return;
    }
    if (library.playlists.length === 1) {
      onAddTrack(library.playlists[0]!.id, track);
      return;
    }
    setChoosingTrack(track);
  };

  return (
    <main className="recent-view">
      <div className="view-title-row library-title-row">
        <div>
          <h1>{t('libraryTitle')}</h1>
          <p>{t('recentSubtitle')}</p>
        </div>
        <button
          className="circle-action"
          type="button"
          aria-label={t('recentTitle')}
          aria-pressed={searchOpen}
          onClick={() => setSearchOpen((current) => !current)}
        >
          {searchOpen ? <X size={20} /> : <Search size={20} />}
        </button>
      </div>

      {searchOpen ? (
        <label className="library-search">
          <Search size={17} />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t('recentTitle')}
          />
        </label>
      ) : null}

      <div className="recent-toolbar">
        <span><Clock3 size={15} />{t('recentTitle')}</span>
        <span><SlidersHorizontal size={14} />{t('recentSort')}</span>
      </div>

      {!loaded ? <p className="recent-loading">{t('loadingPlaylists')}</p> : null}
      {loaded && tracks.length === 0 ? (
        <section className="recent-empty">
          <span><Clock3 size={30} /></span>
          <h2>{t('recentEmptyTitle')}</h2>
          <p>{t('recentEmptyDescription')}</p>
        </section>
      ) : null}

      <section className="recent-list" aria-label={t('recentTitle')}>
        {filteredTracks.map((track) => {
          const thumbnail = getTrackThumbnailUrl(track.url);
          return (
            <article className="recent-row" key={track.id}>
              <div className="recent-thumbnail">
                {thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : <Music2 size={24} />}
                <span>{formatTime(track.duration)}</span>
              </div>
              <div className="recent-copy">
                <strong>{track.title}</strong>
                <small>{track.platform} · {formatRelativeTime(track.lastPlayedAt, Date.now(), t)}</small>
                <div className="recent-preset">
                  <span>Key {formatSignedSemitones(track.practice.pitchSemitones)}</span>
                  <span>{track.practice.speed.toFixed(2)}×</span>
                </div>
              </div>
              <div className="recent-actions">
                <button
                  type="button"
                  className="recent-play"
                  disabled={busy}
                  onClick={() => onPlay(track)}
                  aria-label={t('recentPlaySameTab', { title: track.title })}
                >
                  <Play size={17} fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={() => addTrack(track)}
                  aria-label={`${t('addToPlaylist')} ${track.title}`}
                >
                  <ListPlus size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(track.id)}
                  aria-label={t('recentRemove', { title: track.title })}
                >
                  <X size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {choosingTrack ? (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setChoosingTrack(null)}>
          <section
            className="playlist-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-choose-playlist-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-heading">
              <h2 id="recent-choose-playlist-title">{t('addWhichPlaylist')}</h2>
              <button type="button" onClick={() => setChoosingTrack(null)} aria-label={t('close')}><X size={19} /></button>
            </div>
            <div className="sheet-options">
              {library.playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => {
                    onAddTrack(playlist.id, choosingTrack);
                    setChoosingTrack(null);
                  }}
                >
                  <ListMusic size={18} />
                  <span><strong>{playlist.name}</strong><small>{t('songsCount', { value: playlist.tracks.length })}</small></span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function formatRelativeTime(
  timestamp: number,
  now: number,
  t: ReturnType<typeof useI18n>['t'],
): string {
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60_000);
  if (minutes < 1) {
    return t('justNow');
  }
  if (minutes < 60) {
    return t('minutesAgo', { value: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('hoursAgo', { value: hours });
  }
  return t('daysAgo', { value: Math.floor(hours / 24) });
}
