import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UsersRepository } from './users.repository';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class InMemoryUsersRepository implements UsersRepository {
  private readonly store = new Map<string, UserEntity>();

  async create(user: UserEntity): Promise<UserEntity> {
    user.id = randomUUID();
    this.store.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    for (const u of this.store.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  async update(id: string, patch: Partial<UserEntity>): Promise<UserEntity | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = Object.assign(existing, patch);
    this.store.set(id, updated);
    return updated;
  }

  async findAll(): Promise<UserEntity[]> {
    return [...this.store.values()];
  }
}
