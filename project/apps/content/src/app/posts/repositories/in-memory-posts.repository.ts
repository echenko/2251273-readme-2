import { Injectable } from '@nestjs/common';
import { Post, PostType, DEFAULT_POSTS_LIMIT } from '@readme/shared-types';
import { PostsRepository, PostQuery } from './posts.repository';

@Injectable()
export class InMemoryPostsRepository implements PostsRepository {
  private readonly store = new Map<string, Post>();

  async create(post: Post): Promise<Post> {
    this.store.set(post.id, post);
    return post;
  }

  async findById(id: string): Promise<Post | null> {
    return this.store.get(id) ?? null;
  }

  async update(id: string, patch: Partial<Post>): Promise<Post | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = Object.assign(existing, patch) as Post;
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  private filter(query: PostQuery): Post[] {
    let items = [...this.store.values()];
    if (query.status) items = items.filter((p) => p.status === query.status);
    if (query.authorId) items = items.filter((p) => p.authorId === query.authorId);
    if (query.type) items = items.filter((p) => p.type === query.type);
    if (query.tag) items = items.filter((p) => p.tags.includes(query.tag as string));
    if (query.search) {
      const needle = query.search.toLowerCase();
      items = items.filter((p) => {
        const title = (p as { title?: string }).title;
        return title ? title.toLowerCase().includes(needle) : false;
      });
    }
    return items;
  }

  async find(query: PostQuery): Promise<Post[]> {
    const items = this.filter(query);
    items.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    const offset = query.offset ?? 0;
    const limit = query.limit ?? DEFAULT_POSTS_LIMIT;
    return items.slice(offset, offset + limit);
  }

  async count(query: PostQuery): Promise<number> {
    return this.filter(query).length;
  }
}
