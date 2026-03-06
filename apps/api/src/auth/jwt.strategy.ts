import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      // Read JWT from the HTTP-only cookie, NOT the Authorization header
      jwtFromRequest: (req: { cookies?: { auth_token?: string } }) =>
        req.cookies?.auth_token ?? null,
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  /**
   * Called after the JWT is verified. Fetches the full user from the DB
   * so controllers can access the complete user object via @CurrentUser().
   * passwordHash is stripped before attaching to req.user.
   */
  async validate(payload: JwtPayload) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Strip sensitive field before attaching to req.user
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
