import { Injectable } from '@nestjs/common';
import { CommentEntity } from '../entities/comment.entity';
import { CommentsRepository } from './comments.repository';

@Injectable()
export class InMemoryCommentsRepository implements CommentsRepository {
  private readonly store = new Map<string, CommentEntity>();

  async create(comment: CommentEntity): Promise<CommentEntity> {
    this.store.set(comment.id, comment);
    return comment;
  }

  async findById(id: string): Promise<CommentEntity | null> {
    return this.store.get(id) ?? null;
  }

  async findByPost(postId: string, offset: number, limit: number): Promise<CommentEntity[]> {
    const items = [...this.store.values()]
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return items.slice(offset, offset + limit);
  }

  async countByPost(postId: string): Promise<number> {
    return [...this.store.values()].filter((c) => c.postId === postId).length;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async deleteByPost(postId: string): Promise<number> {
    let n = 0;
    for (const [id, c] of this.store) {
      if (c.postId === postId) {
        this.store.delete(id);
        n++;
      }
    }
    return n;
  }
}
