import { UserEntity } from '../entities/user.entity';

export abstract class UsersRepository {
  abstract create(user: UserEntity): Promise<UserEntity>;
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract update(id: string, patch: Partial<UserEntity>): Promise<UserEntity | null>;
  abstract findAll(): Promise<UserEntity[]>;
}
