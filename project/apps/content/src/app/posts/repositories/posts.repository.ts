import { Post, PostStatus, PostType, SortType } from '@readme/shared-types';

export interface PostQuery {
  offset?: number;
  limit?: number;
  sortBy?: SortType;
  type?: PostType;
  tag?: string;
  authorId?: string;
  authorIds?: string[];
  status?: PostStatus;
  search?: string;
  publishedAfter?: string;
}

export abstract class PostsRepository {
  abstract create(post: Post): Promise<Post>;
  abstract findById(id: string): Promise<Post | null>;
  abstract update(id: string, patch: Partial<Post>): Promise<Post | null>;
  abstract delete(id: string): Promise<boolean>;
  abstract find(query: PostQuery): Promise<Post[]>;
  abstract count(query: PostQuery): Promise<number>;
}
