import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route handler (or entire controller) as publicly accessible —
 * the global JwtAuthGuard will skip authentication for routes decorated
 * with @Public().
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
