import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop()
  avatarId?: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  registeredAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
