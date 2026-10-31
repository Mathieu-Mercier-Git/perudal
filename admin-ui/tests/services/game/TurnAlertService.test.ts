import TurnAlertService from '../../../src/services/game/TurnAlertService';

const createOscillator: jest.Mock = jest.fn(() => ({
  frequency: {},
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
}));

const startSilence: jest.Mock = jest.fn();

type FakeAudioContext = {
  state: string,
  resume: jest.Mock,
};

let fakeAudioContext: FakeAudioContext;

function installFakeAudioContext(state: string, stateAfterResume: string = state): void {
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = jest.fn(() => {
    fakeAudioContext = {
      state,
      resume: jest.fn(() => {
        fakeAudioContext.state = stateAfterResume;
        return Promise.resolve();
      }),
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      createOscillator,
      createBuffer: jest.fn(() => ({})),
      createBufferSource: jest.fn(() => ({ connect: jest.fn(), start: startSilence })),
      createGain: () => ({
        gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        connect: jest.fn(),
      }),
    } as unknown as FakeAudioContext;
    return fakeAudioContext;
  });
}

const flushPromises = (): Promise<void> => new Promise((resolve: () => void) => {
  setTimeout(resolve, 0);
});

// Trois notes, chacune composée de la note et de son attaque aiguë
const MARIMBA_OSCILLATOR_COUNT: number = 6;

describe('TurnAlertService', () => {
  beforeEach(() => {
    localStorage.clear();
    createOscillator.mockClear();
    startSilence.mockClear();
    delete (navigator as unknown as { audioSession?: unknown }).audioSession;
    Object.defineProperty(navigator, 'vibrate', { value: jest.fn(), configurable: true });
    installFakeAudioContext('running');
  });

  test('vibre et joue le son une fois le son débloqué par un geste du joueur', () => {
    const service: TurnAlertService = new TurnAlertService();
    document.dispatchEvent(new Event('click'));

    service.alert();

    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
    expect(createOscillator).toHaveBeenCalledTimes(MARIMBA_OSCILLATOR_COUNT);
  });

  test('ne joue pas le son tant que le joueur n\'a fait aucun geste', () => {
    new TurnAlertService().alert();

    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
    expect(createOscillator).not.toHaveBeenCalled();
  });

  test('ne joue pas le son si le navigateur le garde suspendu', async () => {
    installFakeAudioContext('suspended');
    const service: TurnAlertService = new TurnAlertService();
    document.dispatchEvent(new Event('click'));

    service.alert();
    await flushPromises();

    expect(createOscillator).not.toHaveBeenCalled();
  });

  test('démarre un son pendant le geste pour débloquer Safari', () => {
    installFakeAudioContext('suspended');
    new TurnAlertService();

    document.dispatchEvent(new Event('click'));

    expect(startSilence).toHaveBeenCalled();
    expect(fakeAudioContext.resume).toHaveBeenCalledTimes(1);
  });

  test('joue le son si la reprise réussit sans geste du joueur', async () => {
    installFakeAudioContext('running', 'running');
    const service: TurnAlertService = new TurnAlertService();
    document.dispatchEvent(new Event('click'));
    fakeAudioContext.state = 'interrupted';

    service.alert();
    expect(createOscillator).not.toHaveBeenCalled();
    await flushPromises();

    expect(createOscillator).toHaveBeenCalledTimes(MARIMBA_OSCILLATOR_COUNT);
  });

  test('ne joue pas une note en retard si la reprise a attendu un geste', async () => {
    installFakeAudioContext('running', 'running');
    const service: TurnAlertService = new TurnAlertService();
    document.dispatchEvent(new Event('click'));
    fakeAudioContext.state = 'interrupted';
    const now: jest.SpyInstance = jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(5000);

    service.alert();
    await flushPromises();
    now.mockRestore();

    expect(createOscillator).not.toHaveBeenCalled();
  });

  test('reprend le son quand le joueur revient sur la page', () => {
    installFakeAudioContext('running', 'running');
    new TurnAlertService();
    document.dispatchEvent(new Event('click'));
    fakeAudioContext.state = 'interrupted';

    document.dispatchEvent(new Event('visibilitychange'));

    expect(fakeAudioContext.resume).toHaveBeenCalledTimes(1);
  });

  test('fait passer le son malgré le mode silencieux de l\'iPhone', () => {
    const audioSession: { type: string } = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { value: audioSession, configurable: true });
    new TurnAlertService();

    document.dispatchEvent(new Event('click'));

    expect(audioSession.type).toBe('playback');
  });

  test('couper le son laisse la vibration et le choix est mémorisé', () => {
    const service: TurnAlertService = new TurnAlertService();
    document.dispatchEvent(new Event('click'));

    service.toggleSound();
    service.alert();

    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
    expect(createOscillator).not.toHaveBeenCalled();
    expect(new TurnAlertService().isSoundEnabled().get()).toBe(false);
  });

  test('réactiver le son le fait entendre tout de suite', () => {
    localStorage.setItem('turn-sound-enabled', 'false');
    const service: TurnAlertService = new TurnAlertService();
    document.dispatchEvent(new Event('click'));

    service.toggleSound();

    expect(service.isSoundEnabled().get()).toBe(true);
    expect(createOscillator).toHaveBeenCalledTimes(MARIMBA_OSCILLATOR_COUNT);
  });

  test('fonctionne sur un navigateur sans vibration', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });

    expect(() => new TurnAlertService().alert()).not.toThrow();
  });
});
