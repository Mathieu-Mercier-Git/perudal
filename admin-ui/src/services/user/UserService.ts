import { Observable, observable, WritableObservable } from 'micro-observables';

const LOCAL_STORAGE_USERNAME = 'username';

export default class UserService {
  private username: WritableObservable<string>;

  constructor() {
    this.username = observable('');
  }

  getUsername(): Observable<string> {
    return this.username.readOnly();
  }

  setUsername(currentUsername: string): void {
    this.username.set(currentUsername);
    localStorage.setItem(LOCAL_STORAGE_USERNAME, currentUsername);
  }

  initializingUserFromStorage() {
    const username: string | null = localStorage.getItem(LOCAL_STORAGE_USERNAME);
    if (username) {
      this.username.set(username);
    }
  }
}
