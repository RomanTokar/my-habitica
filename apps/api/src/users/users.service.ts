import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type UserRow } from '../db/schema';

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  gold: number;
  lastCron: string;
  createdAt: string;
  updatedAt: string;
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    gold: user.gold,
    lastCron: user.lastCron.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  async findById(id: string): Promise<PublicUser> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toPublicUser(user);
  }

}
