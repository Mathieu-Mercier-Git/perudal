import { Observable, observable, WritableObservable } from 'micro-observables';
import { randomPlayerEmoji } from './PlayerEmojis';

const LOCAL_STORAGE_USERNAME: string = 'username';
const LOCAL_STORAGE_EMOJI: string = 'emoji';

export default class UserService {
  private username: WritableObservable<string>;

  // Tiré au hasard au premier passage, puis sauvegardé comme le pseudo
  private emoji: WritableObservable<string>;

  constructor() {
    this.username = observable('');
    this.emoji = observable(randomPlayerEmoji());
  }

  getUsername(): Observable<string> {
    return this.username.readOnly();
  }

  setUsername(currentUsername: string): void {
    this.username.set(currentUsername);
    localStorage.setItem(LOCAL_STORAGE_USERNAME, currentUsername);
  }

  getEmoji(): Observable<string> {
    return this.emoji.readOnly();
  }

  setEmoji(currentEmoji: string): void {
    this.emoji.set(currentEmoji);
    localStorage.setItem(LOCAL_STORAGE_EMOJI, currentEmoji);
  }

  initializingUserFromStorage() {
    const username: string | null = localStorage.getItem(LOCAL_STORAGE_USERNAME);
    if (username) {
      this.username.set(username);
    }
    const emoji: string | null = localStorage.getItem(LOCAL_STORAGE_EMOJI);
    if (emoji) {
      this.emoji.set(emoji);
    } else {
      // Premier passage : l'emoji tiré au hasard est conservé pour les visites suivantes
      this.setEmoji(this.emoji.get());
    }
  }
}
