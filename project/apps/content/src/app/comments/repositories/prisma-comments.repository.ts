import { Injectable } from '@nestjs/common';
import { Comment as PrismaComment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommentsRepository } from './comments.repository';
import { CommentEntity } from '../entities/comment.entity';

@Injectable()
export class PrismaCommentsRepository implements CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(comment: CommentEntity): Promise<CommentEntity> {
    const doc = await this.prisma.comment.create({
      data: {
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        text: comment.text,
        createdAt: comment.createdAt,
      },
    });
    return this.toEntity(doc);
  }

  async findById(id: string): Promise<CommentEntity | null> {
    const doc = await this.prisma.comment.findUnique({ where: { id } });
    return doc ? this.toEntity(doc) : null;
  }

  async findByPost(postId: string, offset: number, limit: number): Promise<CommentEntity[]> {
    const docs = await this.prisma.comment.findMany({
      where: { postId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return docs.map((d) => this.toEntity(d));
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.comment.count({ where: { postId } });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.comment.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteByPost(postId: string): Promise<number> {
    const r = await this.prisma.comment.deleteMany({ where: { postId } });
    return r.count;
  }

  private toEntity(doc: PrismaComment): CommentEntity {
    return {
      id: doc.id,
      postId: doc.postId,
      authorId: doc.authorId,
      text: doc.text,
      createdAt: doc.createdAt,
    };
  }
}
