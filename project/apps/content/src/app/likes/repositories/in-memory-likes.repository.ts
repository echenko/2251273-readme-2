import { Injectable } from '@nestjs/common';
import { LikeEntity } from '../entities/like.entity';
import { LikesRepository } from './likes.repository';

@Injectable()
export class InMemoryLikesRepository implements LikesRepository {
  private readonly store = new Map<string, LikeEntity>();

  async findByUserAndPost(userId: string, postId: string): Promise<LikeEntity | null> {
    for (const like of this.store.values()) {
      if (like.userId === userId && like.postId === postId) return like;
    }
    return null;
  }

  async create(like: LikeEntity): Promise<LikeEntity> {
    this.store.set(like.id, like);
    return like;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async countByPost(postId: string): Promise<number> {
    return [...this.store.values()].filter((l) => l.postId === postId).length;
  }

  async deleteByPost(postId: string): Promise<number> {
    let n = 0;
    for (const [id, l] of this.store) {
      if (l.postId === postId) {
        this.store.delete(id);
        n++;
      }
    }
    return n;
  }
}
