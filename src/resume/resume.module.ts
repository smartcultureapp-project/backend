import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';

@Module({
  imports:     [PrismaModule, AuthModule],
  controllers: [ResumeController],
  providers:   [ResumeService],
})
export class ResumeModule {}
