export abstract class SubscriptionsRepository {
  abstract subscribe(followerId: string, followingId: string): Promise<void>;
  abstract unsubscribe(followerId: string, followingId: string): Promise<void>;
  abstract getSubscriptions(followerId: string): Promise<string[]>;
  abstract getSubscribers(followingId: string): Promise<string[]>;
  abstract isSubscribed(followerId: string, followingId: string): Promise<boolean>;
  abstract countSubscribers(followingId: string): Promise<number>;
}
