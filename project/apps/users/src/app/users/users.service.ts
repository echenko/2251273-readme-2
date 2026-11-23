import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UsersRepository } from './repositories/users.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SERVICES } from '../common/clients/services';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    @Inject(forwardRef(() => HttpService)) private readonly http: HttpService,
  ) {}

  async getDetails(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, refreshTokenHash, ...rest } = user;
    const subscribersCount = await this.subscriptionsRepository.countSubscribers(id);

    let postsCount = 0;
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.content}/posts`, {
          params: { authorId: id, limit: 1 },
        }),
      );
      postsCount = data.total ?? 0;
    } catch {
      // content недоступен — оставляем 0
    }

    return { ...rest, postsCount, subscribersCount };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await user.comparePassword(dto.currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await user.setPassword(dto.newPassword);
    await this.usersRepository.update(user.id, user);
    return { success: true };
  }

  async subscribe(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot subscribe to yourself');
    }

    const targetUser = await this.usersRepository.findById(followingId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.subscriptionsRepository.subscribe(followerId, followingId);
    return { success: true };
  }

  async unsubscribe(followerId: string, followingId: string) {
    await this.subscriptionsRepository.unsubscribe(followerId, followingId);
    return { success: true };
  }

  async getSubscriptions(followerId: string): Promise<string[]> {
    return this.subscriptionsRepository.getSubscriptions(followerId);
  }

  async getSubscribers(followingId: string): Promise<string[]> {
    return this.subscriptionsRepository.getSubscribers(followingId);
  }

  async getFeedAuthorIds(userId: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    const subscriptions = await this.subscriptionsRepository.getSubscriptions(userId);
    return [userId, ...subscriptions.filter((id) => id !== userId)];
  }

  // НОВЫЙ МЕТОД ДЛЯ РАССЫЛКИ
  async getAllEmails(): Promise<string[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => user.email);
  }
}
