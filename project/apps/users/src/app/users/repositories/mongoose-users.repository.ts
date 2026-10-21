import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { UsersRepository } from './users.repository';
import { UserEntity } from '../entities/user.entity';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class MongooseUsersRepository implements UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: UserEntity): Promise<UserEntity> {
    const created = new this.userModel({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarId: user.avatarId,
      passwordHash: user.passwordHash,
      registeredAt: user.registeredAt,
    });
    const saved = await created.save();
    return this.toEntity(saved);
  }

  async findById(id: string): Promise<UserEntity | null> {
    if (!isValidObjectId(id)) return null;   // ← защита от CastError
    const doc = await this.userModel.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await this.userModel.findOne({ email }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async update(id: string, patch: Partial<UserEntity>): Promise<UserEntity | null> {
    if (!isValidObjectId(id)) return null;   // ← защита от CastError
    const { id: _omitId, ...cleanPatch } = patch;
    const doc = await this.userModel
      .findByIdAndUpdate(id, cleanPatch, { new: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(): Promise<UserEntity[]> {
    const docs = await this.userModel.find().exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  private toEntity(doc: UserDocument): UserEntity {
    const entity = new UserEntity();
    entity.id = doc._id.toString();
    entity.email = doc.email;
    entity.firstName = doc.firstName;
    entity.lastName = doc.lastName;
    entity.avatarId = doc.avatarId;
    entity.passwordHash = doc.passwordHash;
    entity.registeredAt = doc.registeredAt;
    return entity;
  }
}
