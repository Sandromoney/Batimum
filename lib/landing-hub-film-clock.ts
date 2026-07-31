/**
 * Horloge de présentation pauseable — source de vérité pour la timeline hub.
 * Les callbacks sont planifiés en temps média (pas en wall-clock brut).
 */

export type FilmClockListener = (elapsedMs: number) => void;

type Job = {
  id: number;
  at: number;
  fn: () => void;
};

export class FilmClock {
  private baseElapsed = 0;
  private runningSince: number | null = null;
  private jobs: Job[] = [];
  private nextId = 1;
  private raf = 0;
  private listeners = new Set<FilmClockListener>();
  private _playing = false;

  get playing() {
    return this._playing;
  }

  now() {
    if (this.runningSince == null) return this.baseElapsed;
    return this.baseElapsed + (performance.now() - this.runningSince);
  }

  subscribe(fn: FilmClockListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const t = this.now();
    this.listeners.forEach((fn) => fn(t));
  }

  private pump = () => {
    this.raf = 0;
    if (!this._playing) return;
    const t = this.now();
    const due = this.jobs.filter((j) => j.at <= t).sort((a, b) => a.at - b.at);
    if (due.length) {
      const dueIds = new Set(due.map((j) => j.id));
      this.jobs = this.jobs.filter((j) => !dueIds.has(j.id));
      for (const job of due) {
        try {
          job.fn();
        } catch {
          /* ignore demo errors */
        }
      }
    }
    this.emit();
    this.raf = requestAnimationFrame(this.pump);
  };

  private ensurePump() {
    if (this._playing && !this.raf) {
      this.raf = requestAnimationFrame(this.pump);
    }
  }

  play() {
    if (this._playing) return;
    this._playing = true;
    this.runningSince = performance.now();
    this.ensurePump();
    this.emit();
  }

  pause() {
    if (!this._playing) return;
    this.baseElapsed = this.now();
    this.runningSince = null;
    this._playing = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.emit();
  }

  /** Fixe le temps média. Par défaut annule les jobs (seek utilisateur). */
  seek(ms: number, opts?: { clearJobs?: boolean }) {
    const t = Math.max(0, ms);
    this.baseElapsed = t;
    this.runningSince = this._playing ? performance.now() : null;
    if (opts?.clearJobs !== false) {
      this.jobs = [];
    }
    this.emit();
    this.ensurePump();
  }

  /** Planifie un callback après `delayMs` de temps média. */
  later(fn: () => void, delayMs: number) {
    return this.at(fn, this.now() + Math.max(0, delayMs));
  }

  /** Planifie à un temps média absolu. */
  at(fn: () => void, absoluteMs: number) {
    const id = this.nextId++;
    this.jobs.push({ id, at: absoluteMs, fn });
    this.ensurePump();
    return id;
  }

  clear(id?: number) {
    if (id == null) {
      this.jobs = [];
      return;
    }
    this.jobs = this.jobs.filter((j) => j.id !== id);
  }

  reset() {
    this.pause();
    this.baseElapsed = 0;
    this.jobs = [];
    this.emit();
  }
}
