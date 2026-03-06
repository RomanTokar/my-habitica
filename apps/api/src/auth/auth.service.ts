import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type UserRow } from '../db/schema';

export interface AuthUserResponse {
  id: string;
  email: string;
  username: string;
  gold: number;
}

function toAuthResponse(user: UserRow): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    gold: user.gold,
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async register(
    email: string,
    username: string,
    password: string,
  ): Promise<{ user: AuthUserResponse; token: string }> {
    const passwordHash = await bcrypt.hash(password, 12);

    let newUser: UserRow;
    try {
      const [inserted] = await db
        .insert(users)
        .values({ email, username, passwordHash })
        .returning();
      newUser = inserted;
    } catch (err: unknown) {
      // Postgres unique constraint violation
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Email or username already in use');
      }
      throw err;
    }

    const token = this.signToken(newUser);

    return { user: toAuthResponse(newUser), token };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthUserResponse; token: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.signToken(user);

    return { user: toAuthResponse(user), token };
  }

  private signToken(user: UserRow): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }
}
