import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DEFAULT_COMMENTS_LIMIT } from '@readme/shared-types';
import { CommentsRepository } from './repositories/comments.repository';
import { CommentEntity } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly commentsRepository: CommentsRepository) {}

  async create(authorId: string, postId: string, dto: CreateCommentDto): Promise<CommentEntity> {
    return this.commentsRepository.create({
      id: randomUUID(),
      postId,
      authorId,
      text: dto.text,
      createdAt: new Date(),
    });
  }

  async listByPost(
    postId: string,
    query: QueryCommentsDto,
  ): Promise<{ items: CommentEntity[]; total: number }> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? DEFAULT_COMMENTS_LIMIT;
    const [items, total] = await Promise.all([
      this.commentsRepository.findByPost(postId, offset, limit),
      this.commentsRepository.countByPost(postId),
    ]);
    return { items, total };
  }

  async remove(authorId: string, id: string): Promise<{ success: boolean }> {
    const comment = await this.commentsRepository.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== authorId) throw new ForbiddenException('Not your comment');
    await this.commentsRepository.delete(id);
    return { success: true };
  }

  async cascadeDeleteByPost(postId: string): Promise<{ deleted: number }> {
    return { deleted: await this.commentsRepository.deleteByPost(postId) };
  }

  async countByPost(postId: string): Promise<number> {
    return this.commentsRepository.countByPost(postId);
  }
}
