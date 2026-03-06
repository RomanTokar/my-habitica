import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ScoringService } from './scoring.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, ScoringService],
  exports: [TasksService, ScoringService],
})
export class TasksModule {}
