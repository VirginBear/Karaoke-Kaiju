export type ReleaseChannel = 'public' | 'development';

export type ReleasePracticeModule =
  | 'key'
  | 'finePitch'
  | 'speed'
  | 'loop'
  | 'bpm'
  | 'vocalReducer'
  | 'equalizer';

export interface ReleasePolicy {
  modules: ReleasePracticeModule[];
  googleDrive: boolean;
  groqLyrics: boolean;
  varispeed: boolean;
  extendedKeyRange: boolean;
}

const PUBLIC_MODULES: ReleasePracticeModule[] = ['key', 'finePitch', 'speed', 'loop'];
const DEVELOPMENT_MODULES: ReleasePracticeModule[] = [
  ...PUBLIC_MODULES,
  'bpm',
  'vocalReducer',
  'equalizer',
];

export function getReleasePolicy(channel: ReleaseChannel): ReleasePolicy {
  const development = channel === 'development';
  return {
    modules: development ? DEVELOPMENT_MODULES : PUBLIC_MODULES,
    googleDrive: development,
    groqLyrics: development,
    varispeed: development,
    extendedKeyRange: development,
  };
}

export const RELEASE_CHANNEL: ReleaseChannel =
  typeof __RELEASE_CHANNEL__ === 'undefined' ? 'public' : __RELEASE_CHANNEL__;

export const RELEASE_POLICY = getReleasePolicy(RELEASE_CHANNEL);
