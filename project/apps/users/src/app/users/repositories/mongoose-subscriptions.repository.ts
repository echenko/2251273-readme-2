import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionsRepository } from './subscriptions.repository';
import { Subscription, SubscriptionDocument } from '../schemas/subscription.schema';

@Injectable()
export class MongooseSubscriptionsRepository implements SubscriptionsRepository {
  constructor(
    @InjectModel(Subscription.name)
    private readonly model: Model<SubscriptionDocument>,
  ) {}

  async subscribe(followerId: string, followingId: string): Promise<void> {
    await this.model.updateOne(
      { followerId, followingId },
      { $setOnInsert: { followerId, followingId } },
      { upsert: true },
    );
  }

  async unsubscribe(followerId: string, followingId: string): Promise<void> {
    await this.model.deleteOne({ followerId, followingId }).exec();
  }

  async getSubscriptions(followerId: string): Promise<string[]> {
    const docs = await this.model.find({ followerId }).exec();
    return docs.map((d) => d.followingId);
  }

  async getSubscribers(followingId: string): Promise<string[]> {
    const docs = await this.model.find({ followingId }).exec();
    return docs.map((d) => d.followerId);
  }

  async isSubscribed(followerId: string, followingId: string): Promise<boolean> {
    const doc = await this.model.findOne({ followerId, followingId }).exec();
    return !!doc;
  }

  async countSubscribers(followingId: string): Promise<number> {
    return this.model.countDocuments({ followingId }).exec();
  }
}
