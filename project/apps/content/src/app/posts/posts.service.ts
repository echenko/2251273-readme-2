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
  Paginated,
} from '@readme/shared-types';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
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

const MAX_FETCH = 10000;

type CreatePostDtoUnion =
  | CreateTextPostDto
  | CreateVideoPostDto
  | CreateQuotePostDto
  | CreatePhotoPostDto
  | CreateLinkPostDto;

@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    @Inject(forwardRef(() => CommentsService)) private readonly commentsService: CommentsService,
    @Inject(forwardRef(() => LikesService)) private readonly likesService: LikesService,
  ) {}

  private async validateBody(body: Record<string, unknown>): Promise<CreatePostDtoUnion> {
    const map: Record<string, ClassConstructor<CreatePostDtoUnion>> = {
      [PostType.Text]: CreateTextPostDto,
      [PostType.Video]: CreateVideoPostDto,
      [PostType.Quote]: CreateQuotePostDto,
      [PostType.Photo]: CreatePhotoPostDto,
      [PostType.Link]: CreateLinkPostDto,
    };

    const DtoClass = map[body?.type as string];
    if (!DtoClass) {
      throw new BadRequestException(`Unknown post type: ${body?.type}`);
    }

    const instance = plainToInstance(DtoClass, body);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      const messages = errors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .concat(
          errors.flatMap((error) =>
            Object.values(error.children ?? {}).flatMap((childError: ValidationError) =>
              Object.values(childError.constraints ?? {}),
            ),
          ),
        );
      throw new BadRequestException(messages);
    }
    return instance;
  }

  async create(authorId: string, body: Record<string, unknown>): Promise<Post> {
    const dto = await this.validateBody(body);

    const tags: string[] = Array.from(
      new Set((dto.tags ?? []).map((tag: string) => tag.toLowerCase().trim()))
    );

    const base = createPostBase({
      id: randomUUID(),
      type: dto.type,
      authorId,
      tags,
    });

    const postData = { ...base, ...dto } as unknown as Post;
    return this.postsRepository.create(postData);
  }

  async getById(id: string): Promise<Post> {
    const post = await this.postsRepository.findById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async list(query: QueryPostsDto): Promise<Paginated<Post>> {
    const limit = query.limit ?? DEFAULT_POSTS_LIMIT;
    const offset = query.offset ?? 0;

    if (Array.isArray(query.authorIds) && query.authorIds.length === 0) {
      return { items: [], total: 0, limit, offset, totalPages: 0, hasNext: false };
    }

    const repoQuery: PostQuery = {
      offset,
      limit,
      sortBy: query.sortBy ?? SortType.Date,
      type: query.type,
      tag: query.tag,
      search: query.search,
      authorId: query.authorId,
      authorIds: query.authorIds,
      status: PostStatus.Published,
    };

    if (query.sortBy === SortType.Likes || query.sortBy === SortType.Comments) {
      const all = await this.postsRepository.find({
        ...repoQuery,
        offset: 0,
        limit: MAX_FETCH,
      });

      const withCounts = await Promise.all(
        all.map(async (post) => ({
          post,
          likes: (await this.likesService.count(post.id)).count,
          comments: await this.commentsService.countByPost(post.id),
        })),
      );

      withCounts.sort((a, b) =>
        query.sortBy === SortType.Likes
          ? b.likes - a.likes
          : b.comments - a.comments,
      );

      const total = withCounts.length;
      const items = withCounts.slice(offset, offset + limit).map((item) => item.post);

      return {
        items,
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + items.length < total,
      };
    }

    const [items, total] = await Promise.all([
      this.postsRepository.find(repoQuery),
      this.postsRepository.count(repoQuery),
    ]);

    return {
      items,
      total,
      limit,
      offset,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + items.length < total,
    };
  }

  async feed(query: QueryPostsDto): Promise<Paginated<Post>> {
    if (!query.authorIds || query.authorIds.length === 0) {
      return {
        items: [],
        total: 0,
        limit: query.limit ?? DEFAULT_POSTS_LIMIT,
        offset: query.offset ?? 0,
        totalPages: 0,
        hasNext: false,
      };
    }
    return this.list(query);
  }

  async drafts(authorId: string): Promise<Paginated<Post>> {
    const limit = DEFAULT_POSTS_LIMIT;
    const offset = 0;
    const repoQuery: PostQuery = { authorId, status: PostStatus.Draft, limit, offset };
    const [items, total] = await Promise.all([
      this.postsRepository.find(repoQuery),
      this.postsRepository.count(repoQuery),
    ]);
    return {
      items,
      total,
      limit,
      offset,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + items.length < total
    };
  }

  async update(authorId: string, id: string, patch: Partial<Post>): Promise<Post> {
    const post = await this.getById(id);
    if (post.authorId !== authorId) {
      throw new ForbiddenException('Not your post');
    }
    return (await this.postsRepository.update(id, patch)) as Post;
  }

  async remove(authorId: string, id: string): Promise<{ success: boolean }> {
    const post = await this.getById(id);
    if (post.authorId !== authorId) {
      throw new ForbiddenException('Not your post');
    }
    await this.commentsService.cascadeDeleteByPost(id);
    await this.likesService.cascadeDeleteByPost(id);
    await this.postsRepository.delete(id);
    return { success: true };
  }

  async repost(userId: string, id: string): Promise<Post> {
    const original = await this.getById(id);
    const already = await this.postsRepository.find({ authorId: userId, limit: MAX_FETCH });
    if (already.some((post) => post.originalPostId === id)) {
      throw new ForbiddenException('Already reposted');
    }

    const repostData = {
      ...original,
      id: randomUUID(),
      authorId: userId,
      isRepost: true,
      originalPostId: original.id,
      originalAuthorId: original.authorId,
    } as unknown as Post;

    return this.postsRepository.create(repostData);
  }

  async publishedByAuthor(authorId: string): Promise<Paginated<Post>> {
    const limit = DEFAULT_POSTS_LIMIT;
    const offset = 0;
    const repoQuery: PostQuery = { authorId, status: PostStatus.Published, limit, offset };
    const [items, total] = await Promise.all([
      this.postsRepository.find(repoQuery),
      this.postsRepository.count(repoQuery),
    ]);
    return {
      items,
      total,
      limit,
      offset,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + items.length < total
    };
  }
}
