export type User = {
  id: string;
  email: string;
  nickname: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserWithPasswordHash = User & {
  passwordHash: string;
};

export type UserCreateInput = {
  email: string;
  passwordHash: string;
  nickname: string;
};

export interface UserRepository {
  create(input: UserCreateInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPasswordHash | null>;
  findById(id: string): Promise<User | null>;
}