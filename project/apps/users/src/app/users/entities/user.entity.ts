import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '@readme/shared-types';

export class UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarId?: string;
  passwordHash: string;
  registeredAt: Date;

  async setPassword(plain: string): Promise<void> {
    this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async comparePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
  }

  toResponse() {
    const { passwordHash, ...rest } = this;
    return rest;
  }
}
