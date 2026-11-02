import { Injectable } from '@nestjs/common';
import { Like as PrismaLike } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LikesRepository } from './likes.repository';
import { LikeEntity } from '../entities/like.entity';

@Injectable()
export class PrismaLikesRepository implements LikesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndPost(userId: string, postId: string): Promise<LikeEntity | null> {
    const doc = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return doc ? this.toEntity(doc) : null;
  }

  async create(like: LikeEntity): Promise<LikeEntity> {
    const doc = await this.prisma.like.create({
      data: {
        id: like.id,
        postId: like.postId,
        userId: like.userId,
        createdAt: like.createdAt,
      },
    });
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.like.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.like.count({ where: { postId } });
  }

  async deleteByPost(postId: string): Promise<number> {
    const r = await this.prisma.like.deleteMany({ where: { postId } });
    return r.count;
  }

  private toEntity(doc: PrismaLike): LikeEntity {
    return {
      id: doc.id,
      postId: doc.postId,
      userId: doc.userId,
      createdAt: doc.createdAt,
    };
  }
}
