import { User } from "src/user/entities/user.entity";

export const formatFindAllCollectors = (user: User) => {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    document: user.document,
    photo: user.photo,
    createdAt: user.createdAt,
  };
};