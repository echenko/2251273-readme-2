import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Post, PostStatus, SortType, Paginated, DEFAULT_POSTS_LIMIT } from '@readme/shared-types';
import { PostsRepository, PostQuery } from './posts.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaPostsRepository implements PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(post: Post): Promise<Post> {
    return this.prisma.post.create({ data: post as Prisma.PostCreateInput }) as unknown as Post;
  }

  async findById(id: string): Promise<Post | null> {
    const doc = await this.prisma.post.findUnique({ where: { id } });
    return doc as unknown as Post | null;
  }

  async find(query: PostQuery): Promise<Post[]> {
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sortBy ?? SortType.Date);

    const docs = await this.prisma.post.findMany({
      where,
      orderBy,
      skip: query.offset ?? 0,
      take: query.limit ?? DEFAULT_POSTS_LIMIT,
    });

    return docs as unknown as Post[];
  }

  async count(query: PostQuery): Promise<number> {
    const where = this.buildWhere(query);
    return this.prisma.post.count({ where });
  }

  async update(id: string, patch: Partial<Post>): Promise<Post> {
    const prismaData = this.toPrismaData(patch as Record<string, unknown>, true);
    const doc = await this.prisma.post.update({
      where: { id },
      data: prismaData as Prisma.PostUpdateInput,
    });
    return doc as unknown as Post;
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.post.delete({ where: { id } });
    return true;
  }

  private buildWhere(query: PostQuery): Prisma.PostWhereInput {
    const where: Prisma.PostWhereInput = {};

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.authorIds && query.authorIds.length > 0) {
      where.authorId = { in: query.authorIds };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { text: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.publishedAfter) {
      where.publishedAt = { gte: new Date(query.publishedAfter) };
    }

    return where;
  }

  private buildOrderBy(sortBy: SortType) {
    if (sortBy === SortType.Date) {
      return { createdAt: 'desc' as const };
    }
    return { createdAt: 'desc' as const };
  }

  private toPrismaData(
    postData: Record<string, unknown>,
    isPatch = false,
  ): Prisma.PostCreateInput | Prisma.PostUpdateInput {
    const prismaData: Record<string, unknown> = {};

    const copyableFields: string[] = [
      'type',
      'status',
      'authorId',
      'tags',
      'title',
      'announcement',
      'text',
      'videoUrl',
      'quoteText',
      'quoteAuthor',
      'photoId',
      'url',
      'description',
      'isRepost',
      'originalPostId',
      'originalAuthorId',
    ];

    for (const field of copyableFields) {
      if (postData[field] !== undefined) {
        prismaData[field] = postData[field];
      }
    }

    if (!isPatch) {
      if (postData.id !== undefined) {
        prismaData.id = postData.id;
      }
      if (postData.createdAt !== undefined) {
        prismaData.createdAt = postData.createdAt as Date;
      }
      if (postData.publishedAt !== undefined) {
        prismaData.publishedAt = postData.publishedAt as Date;
      }
    }

    return prismaData as Prisma.PostCreateInput | Prisma.PostUpdateInput;
  }
}
