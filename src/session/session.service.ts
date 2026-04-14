import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInterviewTurnDto } from './dto/create-interview-turn.dto';
import type { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.session.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOneForUser(id: string, userId: string) {
    const session = await this.prisma.session.findFirst({ where: {
      id, userId,
    } });

    if (!session) {
      throw new NotFoundException(`Session(${id})를 찾을 수 없습니다`);
    }

    return session;
  }

  async updateForUser(id: string, userId: string, dto: UpdateSessionDto) {
    await this.findOneForUser(id, userId);

    return this.prisma.session.update({
      where: { id },
      data:  {
        ...dto.phase !== undefined ? { phase: dto.phase } : {},
        ...dto.resumeAnalysisId !== undefined ? { resumeAnalysisId: dto.resumeAnalysisId } : {},
        ...dto.evaluationSheetId !== undefined ? { evaluationSheetId: dto.evaluationSheetId } : {},
      },
    });
  }

  async listInterviewTurns(sessionId: string, userId: string) {
    await this.findOneForUser(sessionId, userId);

    return this.prisma.interviewTurn.findMany({
      where:   { sessionId },
      orderBy: [{ turnIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async addInterviewTurn(sessionId: string,
    userId: string,
    dto: CreateInterviewTurnDto) {
    await this.findOneForUser(sessionId, userId);

    return this.prisma.interviewTurn.create({ data: {
      id:              nanoid(),
      sessionId,
      question:        dto.question ?? null,
      answer:          dto.answer ?? null,
      score:           dto.score ?? null,
      feedbackGood:    dto.feedbackGood ?? null,
      feedbackImprove: dto.feedbackImprove ?? null,
      betterAnswer:    dto.betterAnswer ?? null,
      turnIndex:       dto.turnIndex ?? null,
    } });
  }
}
