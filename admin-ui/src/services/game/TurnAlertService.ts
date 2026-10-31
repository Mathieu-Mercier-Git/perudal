import { Observable, observable, WritableObservable } from 'micro-observables';

const LOCAL_STORAGE_SOUND_ENABLED: string = 'turn-sound-enabled';
const VIBRATION_MS: number = 200;
// Marimba : trois notes montantes (do, mi, sol), avec une brève harmonique aiguë qui imite l'attaque sur le bois
const MARIMBA_FREQUENCIES_HZ: number[] = [523, 659, 784];
const MARIMBA_NOTE_SPACING_S: number = 0.12;
const MARIMBA_NOTE_DURATION_S: number = 0.35;
const MARIMBA_NOTE_VOLUME: number = 0.42;
const MARIMBA_ATTACK_RATIO: number = 4;
const MARIMBA_ATTACK_DURATION_S: number = 0.05;
const MARIMBA_ATTACK_VOLUME: number = 0.12;
// Seuls ces gestes autorisent le son sur tous les navigateurs (pointerdown ne suffit pas sur iPhone)
const AUDIO_UNLOCK_EVENTS: string[] = ['click', 'touchend', 'keydown'];
// Au-delà, la reprise du son vient d'un geste sans rapport avec le tour : on ne joue plus la note en retard
const LATE_RESUME_MAX_MS: number = 1000;

// Absent des types de TypeScript : disponible à partir de Safari 16.4
type NavigatorWithAudioSession = Navigator & { audioSession?: { type: string } };

/**
 * Prévient le joueur que c'est à lui de jouer : une vibration (absente sur iPhone) et un court motif de marimba.
 * Le son est généré par le navigateur et peut être coupé depuis le menu de la partie.
 */
export default class TurnAlertService {
  private soundEnabled: WritableObservable<boolean>;

  private audioContext: AudioContext | undefined;

  constructor() {
    this.soundEnabled = observable(localStorage.getItem(LOCAL_STORAGE_SOUND_ENABLED) !== 'false');
    // Le navigateur ne débloque le son que pendant un geste du joueur : on écoute dès le démarrage de
    // l'appli, car c'est peut-être à son tour qu'il arrivera, sans avoir rien touché depuis le lobby
    AUDIO_UNLOCK_EVENTS.forEach((event: string) => document.addEventListener(event, this.unlockAudio, true));
    // L'iPhone interrompt le son en arrière-plan : au retour, la reprise peut réussir sans geste du joueur
    document.addEventListener('visibilitychange', this.resumeAudio);
  }

  isSoundEnabled(): Observable<boolean> {
    return this.soundEnabled.readOnly();
  }

  toggleSound(): void {
    const isEnabled: boolean = !this.soundEnabled.get();
    this.soundEnabled.set(isEnabled);
    localStorage.setItem(LOCAL_STORAGE_SOUND_ENABLED, String(isEnabled));
    if (isEnabled) { // le joueur entend tout de suite ce qu'il vient d'activer
      this.playSound();
    }
  }

  alert(): void {
    // eslint-disable-next-line compat/compat -- absente sur iPhone, d'où l'appel conditionnel
    navigator.vibrate?.(VIBRATION_MS);
    if (this.soundEnabled.get()) {
      this.playSound();
    }
  }

  private unlockAudio = (): void => {
    if (typeof AudioContext === 'undefined') {
      return;
    }
    if (!this.audioContext) {
      TurnAlertService.allowSoundInSilentMode();
      // eslint-disable-next-line compat/compat -- disponibilité vérifiée juste au-dessus
      this.audioContext = new AudioContext();
    }
    // Pas seulement au premier geste : l'iPhone suspend de nouveau le son au retour d'arrière-plan
    if (this.audioContext.state !== 'running') {
      TurnAlertService.playSilence(this.audioContext);
      this.resumeAudio();
    }
  };

  private resumeAudio = (): void => {
    if (this.audioContext && this.audioContext.state !== 'running' && document.visibilityState === 'visible') {
      this.audioContext.resume().catch(() => undefined);
    }
  };

  /** Sans cela, l'iPhone en mode silencieux coupe le son, et la vibration n'y existe pas : le joueur n'aurait rien */
  private static allowSoundInSilentMode(): void {
    const { audioSession }: NavigatorWithAudioSession = navigator;
    if (audioSession) {
      audioSession.type = 'playback';
    }
  }

  /** Safari ne débloque vraiment le son que si un son démarre pendant le geste du joueur */
  private static playSilence(context: AudioContext): void {
    const source: AudioBufferSourceNode = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    source.connect(context.destination);
    source.start();
  }

  private playSound(): void {
    const context: AudioContext | undefined = this.audioContext;
    if (!context) { // aucun geste du joueur depuis le chargement de la page : le son reste bloqué
      return;
    }
    if (context.state === 'running') {
      TurnAlertService.playMarimba(context);
      return;
    }
    // Son interrompu, par exemple au retour d'arrière-plan : la reprise peut réussir sans geste du joueur.
    // Sinon elle n'aboutit qu'au prochain geste, et la note arriverait à contretemps
    const requestedAt: number = Date.now();
    context.resume()
      .then(() => {
        if (context.state === 'running' && Date.now() - requestedAt <= LATE_RESUME_MAX_MS) {
          TurnAlertService.playMarimba(context);
        }
      })
      .catch(() => undefined);
  }

  private static playMarimba(context: AudioContext): void {
    MARIMBA_FREQUENCIES_HZ.forEach((frequency: number, index: number) => {
      const startTime: number = context.currentTime + index * MARIMBA_NOTE_SPACING_S;
      TurnAlertService.playTone(context, frequency, startTime, MARIMBA_NOTE_DURATION_S, MARIMBA_NOTE_VOLUME);
      TurnAlertService.playTone(
        context,
        frequency * MARIMBA_ATTACK_RATIO,
        startTime,
        MARIMBA_ATTACK_DURATION_S,
        MARIMBA_ATTACK_VOLUME,
      );
    });
  }

  private static playTone(
    context: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
  ): void {
    const endTime: number = startTime + duration;
    const oscillator: OscillatorNode = context.createOscillator();
    const gain: GainNode = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime); // évite le clic en fin de note
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  }
}
