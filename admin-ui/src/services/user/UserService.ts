import { Observable, observable, WritableObservable } from 'micro-observables';


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
  }
}
