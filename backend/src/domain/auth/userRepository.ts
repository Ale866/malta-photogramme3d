export type UserDTO = {
  id: string;
  email: string;
  nickname: string;
};

export type UserWithPasswordHash = UserDTO & {
  passwordHash: string;
};

export interface UserRepository {
  create(input: UserDTO): Promise<UserDTO>;
  findByEmail(email: string): Promise<UserDTO | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPasswordHash | null>;
  findById(id: string): Promise<UserDTO | null>;
}