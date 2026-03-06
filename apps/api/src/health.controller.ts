import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Public } from './auth/public.decorator';
import { db } from './db';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ok' };
    } catch {
      throw new HttpException(
        { status: 'error', message: 'Database unreachable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
