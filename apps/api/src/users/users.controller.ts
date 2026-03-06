import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserRow } from '../db/schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Returns the currently authenticated user's profile (no password hash).
   */
  @Get('me')
  async getMe(@CurrentUser() user: UserRow) {
    return this.usersService.findById(user.id);
  }
}
