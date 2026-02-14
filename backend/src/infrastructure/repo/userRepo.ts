import { UserModel } from '../db/models/UserModel';
import type { UserDoc } from '../db/models/UserModel';

export type UserDTO = {
  id: string;
  email: string;
  nickname: string;
};

export type UserWithPasswordHash = UserDTO & { passwordHash: string };

export const userRepo = {
  async create(input: { email: string; passwordHash: string; nickname?: string }): Promise<UserDTO> {
    const doc = await UserModel.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      nickname: input.nickname,
    });

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
    };
  },

  async findByEmail(email: string): Promise<UserDTO | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
    };
  },

  async findByEmailWithPassword(email: string): Promise<UserWithPasswordHash | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!doc) return null;

    const passwordHash = (doc as UserDoc & { passwordHash: string }).passwordHash;

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
      passwordHash,
    };
  },

  async findById(id: string): Promise<UserDTO | null> {
    const doc = await UserModel.findById(id);
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      email: doc.email,
      nickname: doc.nickname,
    };
  },
};