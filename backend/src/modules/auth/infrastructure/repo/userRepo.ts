import { User, UserCreateInput, UserWithPasswordHash } from '../../domain/userRepository';
import { UserModel } from '../db/models/UserModel';

export const userRepo = {
  async create(input: UserCreateInput): Promise<User> {
    const doc = await UserModel.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      nickname: input.nickname,
    });

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  async findByEmailWithPassword(email: string): Promise<UserWithPasswordHash | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      passwordHash: doc.passwordHash!,
    };
  },

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
};
