export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarId?: string;
  passwordHash: string;
  registeredAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;
