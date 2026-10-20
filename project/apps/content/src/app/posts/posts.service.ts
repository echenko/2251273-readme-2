import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Post,
  PostStatus,
  PostType,
  SortType,
  DEFAULT_POSTS_LIMIT,
  DEFAULT_SEARCH_LIMIT,
} from '@readme/shared-types';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PostsRepository, PostQuery } from './repositories/posts.repository';
import {
  CreateLinkPostDto,
  CreatePhotoPostDto,
  CreateQuotePostDto,
  CreateTextPostDto,
  CreateVideoPostDto,
} from './dto/create-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { createPostBase } from './entities/post.entity';
import { CommentsService } from '../comments/comments.service';
import { LikesService } from '../likes/likes.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    @Inject(forwardRef(() => CommentsService)) private readonly commentsService: CommentsService,
    @Inject(forwardRef(() => LikesService)) private readonly likesService: LikesService,
  ) {}

  private async validateBody(body: any) {
    const map: Record<string, new () => any> = {
      [PostType.Text]: CreateTextPostDto,
      [PostType.Video]: CreateVideoPostDto,
      [PostType.Quote]: CreateQuotePostDto,
      [PostType.Photo]: CreatePhotoPostDto,
      [PostType.Link]: CreateLinkPostDto,
    };
    const Cls = map[body?.type];
    if (!Cls) throw new BadRequestException(`Unknown post type: ${body?.type}`);

    const instance = plainToInstance(Cls, body);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      const messages = errors
        .flatMap((e) => Object.values(e.constraints ?? {}))
        .concat(
          errors.flatMap((e) =>
            Object.values(e.children ?? {}).flatMap((c: any) =>
              Object.values(c.constraints ?? {}),
            ),
          ),
        );
      throw new BadRequestException(messages);
    }
    return instance;
  }

  async create(authorId: string, body: any): Promise<Post> {
    const dto = await this.validateBody(body);
    const base = createPostBase({
      id: randomUUID(),
      type: dto.type,
      authorId,
      tags: (dto.tags ?? []).map((t: string) => t.toLowerCase()),
    });
    return this.postsRepository.create({ ...(base as any), ...(dto as any) });
  }

  async getById(id: string): Promise<Post> {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async list(query: QueryPostsDto): Promise<{ items: Post[]; total: number }> {
    const repoQuery: PostQuery = {
      offset: query.offset,
      limit: query.limit ?? DEFAULT_POSTS_LIMIT,
      sortBy: query.sortBy ?? SortType.Date,
      type: query.type,
      tag: query.tag,
      search: query.search,
      status: PostStatus.Published,
    };
    const [items, total] = await Promise.all([
      this.postsRepository.find(repoQuery),
      this.postsRepository.count(repoQuery),
    ]);
    return { items, total };
  }

  async drafts(authorId: string): Promise<{ items: Post[]; total: number }> {
    const repoQuery: PostQuery = {
      authorId,
      status: PostStatus.Draft,
      limit: DEFAULT_POSTS_LIMIT,
      offset: 0,
    };
    const [items, total] = await Promise.all([
      this.postsRepository.find(repoQuery),
      this.postsRepository.count(repoQuery),
    ]);
    return { items, total };
  }

  async update(authorId: string, id: string, patch: Partial<Post>): Promise<Post> {
    const post = await this.getById(id);
    if (post.authorId !== authorId) throw new ForbiddenException('Not your post');
    return (await this.postsRepository.update(id, patch)) as Post;
  }

  async remove(authorId: string, id: string): Promise<{ success: boolean }> {
    const post = await this.getById(id);
    if (post.authorId !== authorId) throw new ForbiddenException('Not your post');
    await this.commentsService.cascadeDeleteByPost(id);
    await this.likesService.cascadeDeleteByPost(id);
    await this.postsRepository.delete(id);
    return { success: true };
  }

  async repost(userId: string, id: string): Promise<Post> {
    const original = await this.getById(id);
    const already = await this.postsRepository.find({
      authorId: userId,
      limit: DEFAULT_POSTS_LIMIT * 40, // большой запас для проверки дублей
    });
    if (already.some((p) => p.originalPostId === id)) {
      throw new ForbiddenException('Already reposted');
    }
    const base = createPostBase({
      id: randomUUID(),
      type: original.type,
      authorId: userId,
      tags: original.tags,
      isRepost: true,
      originalPostId: original.id,
      originalAuthorId: original.authorId,
    });
    return this.postsRepository.create({ ...(original as any), ...(base as any) } as Post);
  }

  async publishedByAuthor(authorId: string): Promise<{ items: Post[]; total: number }> {
    const repoQuery: PostQuery = {
      authorId,
      status: PostStatus.Published,
      limit: DEFAULT_POSTS_LIMIT,
      offset: 0,
    };
    const [items, total] = await Promise.all([
      this.postsRepository.find(repoQuery),
      this.postsRepository.count(repoQuery),
    ]);
    return { items, total };
  }
}
