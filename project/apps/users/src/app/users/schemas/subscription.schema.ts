import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ collection: 'subscriptions', timestamps: true })
export class Subscription {
  @Prop({ required: true })
  followerId!: string;

  @Prop({ required: true })
  followingId!: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
SubscriptionSchema.index({ followingId: 1 });
