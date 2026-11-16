import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';

@Injectable()
export class InMemorySubscriptionsRepository implements SubscriptionsRepository {
  private readonly store = new Set<string>(); // `${followerId}:${followingId}`

  private key(followerId: string, followingId: string): string {
    return `${followerId}:${followingId}`;
  }

  async subscribe(followerId: string, followingId: string): Promise<void> {
    this.store.add(this.key(followerId, followingId));
  }

  async unsubscribe(followerId: string, followingId: string): Promise<void> {
    this.store.delete(this.key(followerId, followingId));
  }

  async getSubscriptions(followerId: string): Promise<string[]> {
    const result: string[] = [];
    for (const key of this.store) {
      const [f, t] = key.split(':');
      if (f === followerId) result.push(t);
    }
    return result;
  }

  async getSubscribers(followingId: string): Promise<string[]> {
    const result: string[] = [];
    for (const key of this.store) {
      const [f, t] = key.split(':');
      if (t === followingId) result.push(f);
    }
    return result;
  }

  async isSubscribed(followerId: string, followingId: string): Promise<boolean> {
    return this.store.has(this.key(followerId, followingId));
  }

  async countSubscribers(followingId: string): Promise<number> {
    let count = 0;
    for (const key of this.store) {
      const [, t] = key.split(':');
      if (t === followingId) count++;
    }
    return count;
  }
}
