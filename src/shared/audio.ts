export const MIN_SEMITONES = -36;
export const MAX_SEMITONES = 36;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function formatRemainingTime(current: number, total: number): string {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(current)) {
    return '--:--';
  }
  const remaining = Math.max(0, total - current);
  return `-${formatTime(remaining)}`;
}

export function semitoneToRatio(semitones: number, cents = 0): number {
  return 2 ** (semitones / 12) * 2 ** (cents / 1200);
}

export function formatSignedSemitones(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  if (Object.is(value, -0)) {
    return '0';
  }

  return `${value}`;
}

export function formatTime(seconds: number, includeTenths = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return includeTenths ? '--:--.-' : '--:--';
  }

  const wholeMinutes = Math.floor(seconds / 60);
  const remaining = seconds - wholeMinutes * 60;

  if (includeTenths) {
    return `${wholeMinutes.toString().padStart(2, '0')}:${remaining
      .toFixed(1)
      .padStart(4, '0')}`;
  }

  return `${wholeMinutes.toString().padStart(2, '0')}:${Math.floor(remaining)
    .toString()
    .padStart(2, '0')}`;
}

export function toPercent(value: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) {
    return 0;
  }

  return clamp((value / maximum) * 100, 0, 100);
}
