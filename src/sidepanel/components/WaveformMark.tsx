interface WaveformMarkProps {
  size?: 'small' | 'medium';
}

const BAR_HEIGHTS = [16, 28, 42, 30, 18];

export function WaveformMark({ size = 'medium' }: WaveformMarkProps) {
  return (
    <span className={`waveform-mark waveform-mark--${size}`} aria-hidden="true">
      {BAR_HEIGHTS.map((height, index) => (
        <span key={`${height}-${index}`} style={{ '--bar-height': `${height}px` } as React.CSSProperties} />
      ))}
    </span>
  );
}
