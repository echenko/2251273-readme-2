import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '@readme/shared-types';

export class UserEntity {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  avatarId?: string;
  passwordHash!: string;
  registeredAt!: Date;
  refreshTokenHash?: string;

  async setPassword(plain: string): Promise<void> {
    this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async comparePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
  }

  async setRefreshToken(token: string): Promise<void> {
    this.refreshTokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
  }

  async compareRefreshToken(token: string): Promise<boolean> {
    if (!this.refreshTokenHash) return false;
    return bcrypt.compare(token, this.refreshTokenHash);
  }

  toResponse() {
    const { passwordHash, refreshTokenHash, ...rest } = this;
    return rest;
  }
}
