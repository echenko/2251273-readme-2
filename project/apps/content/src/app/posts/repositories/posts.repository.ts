import { Post, PostStatus, PostType } from '@readme/shared-types';

export interface PostQuery {
  offset?: number;
  limit?: number;
  sortBy?: 'date' | 'likes' | 'comments';
  type?: PostType;
  tag?: string;
  authorId?: string;
  status?: PostStatus;
  search?: string;
}

export abstract class PostsRepository {
  abstract create(post: Post): Promise<Post>;
  abstract findById(id: string): Promise<Post | null>;
  abstract update(id: string, patch: Partial<Post>): Promise<Post | null>;
  abstract delete(id: string): Promise<boolean>;
  abstract find(query: PostQuery): Promise<Post[]>;
  abstract count(query: PostQuery): Promise<number>;
}
