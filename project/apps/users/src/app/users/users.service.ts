import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getDetails(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      postsCount: 0,
      subscribersCount: 0,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const ok = await user.comparePassword(dto.currentPassword);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    await user.setPassword(dto.newPassword);
    await this.usersRepository.update(user.id, user);
    return { success: true };
  }
}
