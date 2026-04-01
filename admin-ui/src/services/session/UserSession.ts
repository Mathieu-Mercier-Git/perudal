export type UserSession = {
  idUser: string,
  userName: string,
  fullName: string,
  permissions: string[],
};

export interface UserWithExpiration extends UserSession {
  exp: number,
}
