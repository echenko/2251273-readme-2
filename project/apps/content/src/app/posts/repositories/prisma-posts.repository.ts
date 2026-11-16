import { Injectable } from '@nestjs/common';
import { Post as PrismaPost } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PostsRepository, PostQuery } from './posts.repository';
import { Post, PostStatus, PostType, DEFAULT_POSTS_LIMIT } from '@readme/shared-types';

@Injectable()
export class PrismaPostsRepository implements PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(post: Post): Promise<Post> {
    const saved = await this.prisma.post.create({ data: this.toPrismaData(post) });
    return this.toPost(saved);
  }

  async findById(id: string): Promise<Post | null> {
    const doc = await this.prisma.post.findUnique({ where: { id } });
    return doc ? this.toPost(doc) : null;
  }

  async update(id: string, patch: Partial<Post>): Promise<Post | null> {
    try {
      const doc = await this.prisma.post.update({
        where: { id },
        data: this.toPrismaData(patch as any, true),
      });
      return this.toPost(doc);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.post.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async find(query: PostQuery): Promise<Post[]> {
    const where = this.buildWhere(query);
    const docs = await this.prisma.post.findMany({
      where,
      take: query.limit ?? DEFAULT_POSTS_LIMIT,
      skip: query.offset ?? 0,
      orderBy: { publishedAt: 'desc' },
    });
    return docs.map((d) => this.toPost(d));
  }

  async count(query: PostQuery): Promise<number> {
    return this.prisma.post.count({ where: this.buildWhere(query) });
  }

  private buildWhere(query: PostQuery): any {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.authorId) where.authorId = query.authorId;
    if (query.authorIds && query.authorIds.length > 0) {
      where.authorId = { in: query.authorIds };
    }
    if (query.type) where.type = query.type;
    if (query.tag) where.tags = { has: query.tag };
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    return where;
  }

  private toPrismaData(p: any, isPatch = false): any {
    const d: any = {};
    const copy = [
      'type', 'status', 'authorId', 'tags',
      'title', 'announcement', 'text', 'videoUrl',
      'quoteText', 'quoteAuthor', 'photoId', 'url', 'description',
      'isRepost', 'originalPostId', 'originalAuthorId',
    ];
    for (const k of copy) if (p[k] !== undefined) d[k] = p[k];
    if (!isPatch && p.id !== undefined) d.id = p.id;
    if (!isPatch && p.createdAt !== undefined) d.createdAt = p.createdAt;
    if (!isPatch && p.publishedAt !== undefined) d.publishedAt = p.publishedAt;
    return d;
  }

  private toPost(doc: PrismaPost): Post {
    const base: any = {
      id: doc.id,
      type: doc.type as PostType,
      status: doc.status as PostStatus,
      authorId: doc.authorId,
      tags: doc.tags,
      createdAt: doc.createdAt,
      publishedAt: doc.publishedAt,
      isRepost: doc.isRepost,
      originalPostId: doc.originalPostId ?? undefined,
      originalAuthorId: doc.originalAuthorId ?? undefined,
    };
    switch (doc.type) {
      case 'text': return { ...base, title: doc.title, announcement: doc.announcement, text: doc.text };
      case 'video': return { ...base, title: doc.title, videoUrl: doc.videoUrl };
      case 'quote': return { ...base, quoteText: doc.quoteText, quoteAuthor: doc.quoteAuthor };
      case 'photo': return { ...base, photoId: doc.photoId };
      case 'link': return { ...base, url: doc.url, description: doc.description ?? undefined };
      default: return base;
    }
  }
}
