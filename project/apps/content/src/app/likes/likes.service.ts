import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LikesRepository } from './repositories/likes.repository';
import { LikeEntity } from './entities/like.entity';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly likesRepository: LikesRepository,
    @Inject(forwardRef(() => PostsService))
    private readonly postsService: PostsService,
  ) {}

  async like(userId: string, postId: string): Promise<LikeEntity> {
    // Проверка существования поста
    try {
      await this.postsService.getById(postId);
    } catch {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.likesRepository.findByUserAndPost(userId, postId);
    if (existing) throw new ConflictException('Already liked');

    return this.likesRepository.create({
      id: randomUUID(),
      postId,
      userId,
      createdAt: new Date(),
    });
  }

  async unlike(userId: string, postId: string): Promise<{ success: boolean }> {
    const existing = await this.likesRepository.findByUserAndPost(userId, postId);
    if (!existing) throw new NotFoundException('Like not found');
    await this.likesRepository.delete(existing.id);
    return { success: true };
  }

  async count(postId: string): Promise<{ count: number }> {
    return { count: await this.likesRepository.countByPost(postId) };
  }

  async cascadeDeleteByPost(postId: string): Promise<{ deleted: number }> {
    return { deleted: await this.likesRepository.deleteByPost(postId) };
  }
}
