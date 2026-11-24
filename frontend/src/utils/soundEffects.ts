// Web Audio API Synthesizer - 0 KB audio files, < 1ms latency, instant execution
class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('scoresync_muted') === 'true';
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('scoresync_muted', muted ? 'true' : 'false');
    }
    this.listeners.forEach((listener) => listener(muted));
  }

  public toggleMute(): boolean {
    const next = !this.muted;
    this.setMuted(next);
    return next;
  }

  public subscribeMute(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private triggerHaptic(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Haptics not supported or blocked
      }
    }
  }

  /**
   * 🔔 Satisfying two-tone chime when a round is saved
   */
  public playRoundSaved() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic(18);

    const now = ctx.currentTime;
    const notes = [
      { freq: 1046.5, time: 0, duration: 0.22 },     // C6
      { freq: 1318.51, time: 0.08, duration: 0.35 },  // E6
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.18, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  }

  /**
   * ⚙️ Mechanical wooden click during host transfer roulette tick
   */
  public playRouletteTick(isWinner = false) {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic(isWinner ? [25, 40, 60] : 8);

    const now = ctx.currentTime;
    if (isWinner) {
      // Triumphant chord for the chosen winner
      const chords = [880, 1108.73, 1318.51, 1760]; // A major triad
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.04 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.55);
      });
      return;
    }

    // Fast wooden percussion click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.022);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.025);
  }

  /**
   * 🎺 Victory Fanfare when Results Screen loads
   */
  public playVictoryFanfare() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic([40, 50, 40, 50, 120]);

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0, dur: 0.14 },    // C5
      { freq: 659.25, time: 0.12, dur: 0.14 },  // E5
      { freq: 783.99, time: 0.24, dur: 0.18 },  // G5
      { freq: 1046.5, time: 0.42, dur: 0.65 },  // C6 grand flourish
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.2, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  }

  /**
   * 🎈 Pop sound when emoji reaction is sent or received
   */
  public playReactionPop() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic(10);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const soundEffects = new SoundEffectsManager();
