import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ScoringService } from './scoring.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserRow } from '../db/schema';
import {
  createTaskSchema,
  type TaskType,
  type ScoreDirection,
} from '@my-habitica/shared';

const VALID_TASK_TYPES: TaskType[] = ['habit', 'daily', 'todo', 'reward'];
const VALID_DIRECTIONS: ScoreDirection[] = ['up', 'down'];

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly scoringService: ScoringService,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /tasks - Create a new task
  // ---------------------------------------------------------------------------

  @Post()
  @HttpCode(201)
  async createTask(
    @CurrentUser() user: UserRow,
    @Body() body: unknown,
  ) {
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.tasksService.createTask(user.id, parsed.data as Parameters<typeof this.tasksService.createTask>[1]);
  }

  // ---------------------------------------------------------------------------
  // GET /tasks?type= - List tasks by type
  // ---------------------------------------------------------------------------

  @Get()
  async getTasksByType(
    @CurrentUser() user: UserRow,
    @Query('type') type: string,
  ) {
    if (!type || !VALID_TASK_TYPES.includes(type as TaskType)) {
      throw new BadRequestException(
        `Query param 'type' must be one of: ${VALID_TASK_TYPES.join(', ')}`,
      );
    }

    return this.tasksService.getTasksByType(user.id, type as TaskType);
  }

  // ---------------------------------------------------------------------------
  // POST /tasks/clear-completed - Clear completed todos
  // NOTE: must be declared before /:id routes to avoid route conflicts
  // ---------------------------------------------------------------------------

  @Delete('completed')
  async clearCompleted(@CurrentUser() user: UserRow) {
    return this.tasksService.clearCompletedTodos(user.id);
  }

  // ---------------------------------------------------------------------------
  // GET /tasks/:id - Get single task
  // ---------------------------------------------------------------------------

  @Get(':id')
  async getTaskById(
    @CurrentUser() user: UserRow,
    @Param('id') id: string,
  ) {
    return this.tasksService.getTaskById(user.id, id);
  }

  // ---------------------------------------------------------------------------
  // PUT /tasks/:id - Update task
  // ---------------------------------------------------------------------------

  @Put(':id')
  async updateTask(
    @CurrentUser() user: UserRow,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    // Allow partial updates — use a loose validation approach
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException('Request body must be an object');
    }

    return this.tasksService.updateTask(user.id, id, body as Parameters<typeof this.tasksService.updateTask>[2]);
  }

  // ---------------------------------------------------------------------------
  // DELETE /tasks/:id - Delete task
  // ---------------------------------------------------------------------------

  @Delete(':id')
  async deleteTask(
    @CurrentUser() user: UserRow,
    @Param('id') id: string,
  ) {
    return this.tasksService.deleteTask(user.id, id);
  }

  // ---------------------------------------------------------------------------
  // POST /tasks/:id/score/:direction - Score a task
  // ---------------------------------------------------------------------------

  @Post(':id/score/:direction')
  async scoreTask(
    @CurrentUser() user: UserRow,
    @Param('id') id: string,
    @Param('direction') direction: string,
  ) {
    if (!VALID_DIRECTIONS.includes(direction as ScoreDirection)) {
      throw new BadRequestException("Direction must be 'up' or 'down'");
    }

    const task = await this.tasksService.findAndVerifyOwnership(user.id, id);

    const result = await this.scoringService.scoreTask(
      task,
      user,
      direction as ScoreDirection,
    );

    return {
      task: result.task,
      delta: result.delta,
      goldDelta: result.goldDelta,
      user: result.user,
    };
  }

  // ---------------------------------------------------------------------------
  // POST /tasks/:id/move/:position - Reorder task
  // ---------------------------------------------------------------------------

  @Post(':id/move/:position')
  async moveTask(
    @CurrentUser() user: UserRow,
    @Param('id') id: string,
    @Param('position', ParseIntPipe) position: number,
  ) {
    return this.tasksService.moveTask(user.id, id, position);
  }
}
