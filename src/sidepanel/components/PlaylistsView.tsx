import {
  ChevronDown,
  ChevronRight,
  Download,
  ListMusic,
  ListStart,
  LoaderCircle,
  Music2,
  Pencil,
  Play,
  Plus,
  Repeat1,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  exportPlaylistShareCode,
  getTrackThumbnailUrl,
  parsePlaylistShareCode,
  type PlaylistLibrary,
  type PlaylistTrack,
  type PracticePlaylist,
} from '../../shared/library';
import type {
  AudioSessionState,
  MediaState,
  PlaybackMode,
  PlaybackQueueState,
} from '../../shared/protocol';
import { formatSignedSemitones, formatTime } from '../../shared/audio';
import { useI18n } from '../i18n';

interface PlaylistsViewProps {
  library: PlaylistLibrary;
  loaded: boolean;
  media: MediaState;
  audio: AudioSessionState;
  queue: PlaybackQueueState;
  busy: boolean;
  onCreate: (name: string) => string;
  onRename: (playlistId: string, name: string) => void;
  onDelete: (playlistId: string) => void;
  onAddCurrent: (playlistId: string, media: MediaState, audio: AudioSessionState) => void;
  onRemoveTrack: (playlistId: string, trackId: string) => void;
  onPlayTrack: (playlistId: string, trackId: string, mode: PlaybackMode) => void;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  onImportSharedPlaylist?: (name: string, tracks: PlaylistTrack[]) => string;
}

interface EditorState {
  mode: 'create' | 'rename' | 'import';
  playlistId: string | null;
  value: string;
}

export function PlaylistsView({
  library,
  loaded,
  media,
  audio,
  queue,
  busy,
  onCreate,
  onRename,
  onDelete,
  onAddCurrent,
  onRemoveTrack,
  onPlayTrack,
  onPlaybackModeChange,
  onImportSharedPlaylist,
}: PlaylistsViewProps) {
  const { locale, t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [choosingPlaylist, setChoosingPlaylist] = useState(false);
  const [sharingPlaylist, setSharingPlaylist] = useState<PracticePlaylist | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(queue.mode);
  const selected = useMemo(
    () => library.playlists.find((playlist) => playlist.id === selectedId) ?? null,
    [library.playlists, selectedId],
  );

  useEffect(() => {
    if (selectedId && library.playlists.some((playlist) => playlist.id === selectedId)) {
      return;
    }
    setSelectedId(library.playlists[0]?.id ?? null);
  }, [library.playlists, selectedId]);

  useEffect(() => {
    setPlaybackMode(queue.mode);
  }, [queue.mode]);

  const addCurrent = (playlistId?: string) => {
    if (!media.available) {
      setNotice(t('chooseSongFirst'));
      return;
    }

    if (playlistId) {
      onAddCurrent(playlistId, media, audio);
      const name = library.playlists.find((playlist) => playlist.id === playlistId)?.name;
      setNotice(t('savedToPlaylist', { name: name ?? t('navPlaylists') }));
      setChoosingPlaylist(false);
      return;
    }

    if (library.playlists.length === 0) {
      const id = onCreate(
        locale === 'en'
          ? 'My Practice'
          : locale === 'ja'
          ? 'マイ練習'
          : locale === 'zh-CN'
          ? '我的练唱'
          : '我的練唱',
      );
      onAddCurrent(id, media, audio);
      setSelectedId(id);
      setNotice(t('createdDefaultPlaylist'));
      return;
    }

    if (library.playlists.length === 1) {
      addCurrent(library.playlists[0]?.id);
      return;
    }

    setChoosingPlaylist(true);
  };

  const submitEditor = () => {
    const name = editor?.value.trim();
    if (!editor || !name) {
      return;
    }

    if (editor.mode === 'create') {
      const id = onCreate(name);
      setSelectedId(id);
    } else if (editor.mode === 'rename' && editor.playlistId) {
      onRename(editor.playlistId, name);
    } else if (editor.mode === 'import') {
      const parsed = parsePlaylistShareCode(name);
      if (!parsed) {
        setNotice('無效的歌單分享代碼，請確認複製完整內容');
        return;
      }
      if (onImportSharedPlaylist) {
        const newId = onImportSharedPlaylist(parsed.name, parsed.tracks);
        setSelectedId(newId);
        setNotice(`成功匯入歌單「${parsed.name}」（共 ${parsed.tracks.length} 首歌曲）`);
      }
    }
    setEditor(null);
  };

  const handleSharePlaylist = (playlist: PracticePlaylist) => {
    const code = exportPlaylistShareCode(playlist);
    try {
      void navigator.clipboard.writeText(code);
      setNotice(`已複製歌單「${playlist.name}」分享代碼至剪貼簿！可傳給好友共同點歌。`);
    } catch {
      setSharingPlaylist(playlist);
    }
  };

  return (
    <main className="playlists-view">
      <div className="view-title-row">
        <div>
          <h1>{t('playlistsTitle')}</h1>
          <p>{t('playlistsSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="circle-action"
            type="button"
            onClick={() => setEditor({ mode: 'import', playlistId: null, value: '' })}
            title="貼上代碼匯入好友或KTV歌單"
            aria-label="匯入分享歌單"
          >
            <Download size={18} />
          </button>
          <button
            className="circle-action"
            type="button"
            onClick={() => setEditor({ mode: 'create', playlistId: null, value: '' })}
            aria-label={t('newPlaylist')}
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      <section className="now-playing-strip" aria-label={t('nowPlaying')}>
        <div className="list-section-label">{t('nowPlaying')}</div>
        <div className="now-playing-row">
          <span className="playlist-art"><Music2 size={20} /></span>
          <span className="playlist-copy">
            <strong>{media.available ? media.title : t('noMedia')}</strong>
            <small>{media.available ? media.artist : t('returnToPractice')}</small>
          </span>
          <button type="button" onClick={() => addCurrent()} disabled={!media.available}>
            {t('addToPlaylist')}
          </button>
        </div>
      </section>

      <section className="playlist-playback-mode" aria-label={t('sameTabPractice')}>
        <div className="playlist-mode-heading">
          <div>
            <strong>{t('sameTabPractice')}</strong>
            <small>{getQueueStatus(queue, t)}</small>
          </div>
          {queue.status === 'loading' ? <LoaderCircle className="spin" size={18} /> : null}
        </div>
        <div className="playlist-mode-segments" role="group" aria-label={t('sameTabPractice')}>
          <button
            type="button"
            className={playbackMode === 'sequential' ? 'is-selected' : ''}
            aria-pressed={playbackMode === 'sequential'}
            onClick={() => {
              setPlaybackMode('sequential');
              onPlaybackModeChange('sequential');
            }}
          >
            <ListStart size={16} />{t('sequential')}
          </button>
          <button
            type="button"
            className={playbackMode === 'repeat-one' ? 'is-selected' : ''}
            aria-pressed={playbackMode === 'repeat-one'}
            onClick={() => {
              setPlaybackMode('repeat-one');
              onPlaybackModeChange('repeat-one');
            }}
          >
            <Repeat1 size={16} />{t('repeatOne')}
          </button>
        </div>
      </section>

      {notice ? (
        <div className="playlist-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label={t('close')}><X size={15} /></button>
        </div>
      ) : null}

      <section className="playlist-library" aria-labelledby="my-playlists-heading">
        <div id="my-playlists-heading" className="list-section-label">{t('playlistsTitle')}</div>
        {!loaded ? <p className="playlist-empty">{t('loadingPlaylists')}</p> : null}
        {loaded && library.playlists.length === 0 ? (
          <div className="playlist-empty">
            <ListMusic size={28} />
            <strong>{t('firstPlaylist')}</strong>
            <p>{t('firstPlaylistDescription')}</p>
            <button type="button" onClick={() => setEditor({ mode: 'create', playlistId: null, value: '' })}>
              <Plus size={16} />{t('newPlaylist')}
            </button>
          </div>
        ) : null}
        <div className="playlist-rows">
          {library.playlists.map((playlist) => (
            <button
              key={playlist.id}
              className={playlist.id === selectedId ? 'is-selected' : ''}
              type="button"
              onClick={() => setSelectedId(playlist.id)}
            >
              <span className="playlist-art"><ListMusic size={19} /></span>
              <span className="playlist-copy"><strong>{playlist.name}</strong><small>{t('songsCount', { value: playlist.tracks.length })}</small></span>
              {playlist.id === selectedId ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <SelectedPlaylist
          playlist={selected}
          onAddCurrent={() => addCurrent(selected.id)}
          onRename={() => setEditor({ mode: 'rename', playlistId: selected.id, value: selected.name })}
          onShare={() => handleSharePlaylist(selected)}
          onDelete={() => {
            if (window.confirm(t('deletePlaylistConfirm', { name: selected.name, value: selected.tracks.length }))) {
              onDelete(selected.id);
            }
          }}
          onRemoveTrack={(trackId) => onRemoveTrack(selected.id, trackId)}
          currentTrackId={queue.currentTrackId}
          queueStatus={queue.status}
          busy={busy}
          onPlayTrack={(trackId) => onPlayTrack(selected.id, trackId, playbackMode)}
        />
      ) : null}

      {editor ? (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setEditor(null)}>
          <form
            className="playlist-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="playlist-editor-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              submitEditor();
            }}
          >
            <div className="sheet-heading">
              <h2 id="playlist-editor-title">
                {editor.mode === 'create'
                  ? t('newPlaylist')
                  : editor.mode === 'rename'
                  ? t('renamePlaylist')
                  : '匯入好友/KTV分享歌單'}
              </h2>
              <button type="button" onClick={() => setEditor(null)} aria-label={t('close')}><X size={19} /></button>
            </div>
            <label htmlFor="playlist-name">
              {editor.mode === 'import' ? '請貼上 diaochang://playlist/... 分享代碼' : t('playlistName')}
            </label>
            <input
              id="playlist-name"
              autoFocus
              value={editor.value}
              onChange={(event) => setEditor({ ...editor, value: event.currentTarget.value })}
              placeholder={editor.mode === 'import' ? 'diaochang://playlist/...' : t('playlistNameExample')}
            />
            <button className="sheet-primary" type="submit" disabled={!editor.value.trim()}>
              {editor.mode === 'import' ? '確認匯入' : t('save')}
            </button>
          </form>
        </div>
      ) : null}

      {sharingPlaylist ? (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setSharingPlaylist(null)}>
          <div
            className="playlist-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-playlist-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-heading">
              <h2 id="share-playlist-title">分享歌單「{sharingPlaylist.name}」</h2>
              <button type="button" onClick={() => setSharingPlaylist(null)} aria-label={t('close')}><X size={19} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--secondary-text)', margin: '4px 0 12px' }}>
              複製以下代碼發送給好友，好友點擊「匯入歌單」即可秒速同步整份歌單與專屬練習調性：
            </p>
            <textarea
              readOnly
              style={{
                width: '100%',
                height: '80px',
                padding: '8px',
                fontSize: '11px',
                borderRadius: '8px',
                background: 'var(--surface-secondary)',
                color: 'var(--primary-text)',
                border: '1px solid var(--border-color)',
              }}
              value={exportPlaylistShareCode(sharingPlaylist)}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              className="sheet-primary"
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(exportPlaylistShareCode(sharingPlaylist));
                setNotice(`已成功複製分享代碼！`);
                setSharingPlaylist(null);
              }}
            >
              複製代碼
            </button>
          </div>
        </div>
      ) : null}

      {choosingPlaylist ? (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setChoosingPlaylist(false)}>
          <section className="playlist-sheet" role="dialog" aria-modal="true" aria-labelledby="choose-playlist-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-heading"><h2 id="choose-playlist-title">{t('addWhichPlaylist')}</h2><button type="button" onClick={() => setChoosingPlaylist(false)} aria-label={t('close')}><X size={19} /></button></div>
            <div className="sheet-options">
              {library.playlists.map((playlist) => (
                <button key={playlist.id} type="button" onClick={() => addCurrent(playlist.id)}>
                  <ListMusic size={18} /><span><strong>{playlist.name}</strong><small>{t('songsCount', { value: playlist.tracks.length })}</small></span><ChevronRight size={17} />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function SelectedPlaylist({
  playlist,
  onAddCurrent,
  onRename,
  onShare,
  onDelete,
  onRemoveTrack,
  currentTrackId,
  queueStatus,
  busy,
  onPlayTrack,
}: {
  playlist: PracticePlaylist;
  onAddCurrent: () => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
  onRemoveTrack: (trackId: string) => void;
  currentTrackId: string | null;
  queueStatus: PlaybackQueueState['status'];
  busy: boolean;
  onPlayTrack: (trackId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="selected-playlist">
      <div className="selected-playlist-heading">
        <div><h2>{playlist.name}</h2><p>{t('practiceSongsCount', { value: playlist.tracks.length })}</p></div>
        <div className="selected-playlist-actions">
          <button type="button" onClick={onAddCurrent} aria-label={t('addCurrentSong')} title="加入目前播放歌曲"><Plus size={17} /></button>
          <button type="button" onClick={onShare} aria-label="分享與協作歌單" title="分享歌單代碼給朋友"><Share2 size={16} /></button>
          <button type="button" onClick={onRename} aria-label={t('renamePlaylist')} title="重新命名歌單"><Pencil size={16} /></button>
          <button type="button" onClick={onDelete} aria-label={t('deletePlaylist')} title="刪除歌單"><Trash2 size={16} /></button>
        </div>
      </div>
      {playlist.tracks.length === 0 ? <p className="track-empty">{t('emptyPlaylist')}</p> : null}
      <div className="recent-list" aria-label={playlist.name}>
        {playlist.tracks.map((track) => {
          const isCurrent = currentTrackId === track.id;
          const thumbnail = getTrackThumbnailUrl(track.url);
          return (
            <article key={track.id} className={`recent-row ${isCurrent ? 'is-current' : ''}`}>
              <div className="recent-thumbnail">
                {thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : <Music2 size={24} />}
                <span>{formatTime(track.duration)}</span>
              </div>
              <div className="recent-copy">
                <strong>{track.title}</strong>
                <small>{track.platform} · {track.artist}</small>
                <div className="recent-preset">
                  <span>Key {formatSignedSemitones(track.practice.pitchSemitones)}</span>
                  <span>{track.practice.speed.toFixed(2)}×</span>
                  {track.practice.loopEnabled ? <span>🔁 循環</span> : null}
                </div>
              </div>
              <div className="recent-actions">
                <button
                  className="recent-play"
                  type="button"
                  disabled={busy}
                  onClick={() => onPlayTrack(track.id)}
                  aria-label={t('playTrackSameTab', { title: track.title })}
                >
                  {isCurrent && queueStatus === 'loading' ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTrack(track.id)}
                  aria-label={t('removeTrack', { title: track.title })}
                >
                  <X size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getQueueStatus(
  queue: PlaybackQueueState,
  t: ReturnType<typeof useI18n>['t'],
): string {
  if (queue.status === 'loading') {
    return t('queueSwitching', { current: queue.index + 1, total: queue.total });
  }
  if (queue.status === 'playing') {
    if (queue.mode === 'repeat-one') {
      return t('queueRepeatStatus', { current: queue.index + 1, total: queue.total });
    }
    return t('queueSequentialStatus', { current: queue.index + 1, total: queue.total });
  }
  if (queue.status === 'error') {
    return queue.error ?? t('queueError');
  }
  return t('queueIdle');
}
