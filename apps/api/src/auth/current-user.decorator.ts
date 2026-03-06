import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRow } from '../db/schema';

/**
 * Extracts the authenticated user from request.user (populated by JwtStrategy).
 * Usage: @CurrentUser() user: UserRow
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserRow => {
    const request = ctx.switchToHttp().getRequest<{ user: UserRow }>();
    return request.user;
  },
);
