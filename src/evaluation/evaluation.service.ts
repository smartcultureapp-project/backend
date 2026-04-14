import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EvaluationTemplateData } from './types/evaluation-template.types';

@Injectable()
export class EvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAnalysisId(companyAnalysisId: string, userId: string) {
    await this.assertAnalysisOwnedByUser(companyAnalysisId, userId);

    const template = await this.prisma.evaluationTemplate.findFirst({ where: { companyAnalysisId } });

    if (!template) {
      throw new NotFoundException(`평가 템플릿을 찾을 수 없습니다 (analysisId: ${companyAnalysisId})`);
    }

    return this.formatTemplate(template);
  }

  async findById(id: string, userId: string) {
    const template = await this.prisma.evaluationTemplate.findUnique({ where: { id } });

    if (!template) {
      throw new NotFoundException(`평가 템플릿(${id})를 찾을 수 없습니다`);
    }

    await this.assertAnalysisOwnedByUser(template.companyAnalysisId, userId);

    return this.formatTemplate(template);
  }

  async findBySessionId(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({ where: {
      id: sessionId, userId,
    } });

    if (!session) {
      throw new NotFoundException(`세션(${sessionId})를 찾을 수 없습니다`);
    }

    const analysisId = session.companyAnalysisId ??
      (await this.prisma.companyAnalysis.findFirst({
        where:  { sessionId },
        select: { id: true },
      }))?.id;

    if (!analysisId) {
      throw new NotFoundException(`세션(${sessionId})의 분석 결과를 찾을 수 없습니다`);
    }

    return this.findByAnalysisId(analysisId, userId);
  }

  private async assertAnalysisOwnedByUser(companyAnalysisId: string, userId: string) {
    const analysis = await this.prisma.companyAnalysis.findUnique({ where: { id: companyAnalysisId } });

    if (!analysis) {
      throw new NotFoundException('분석 결과를 찾을 수 없습니다');
    }

    const session = await this.prisma.session.findUnique({ where: { id: analysis.sessionId } });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('평가 템플릿을 찾을 수 없습니다');
    }
  }

  private formatTemplate(template: {
    id:                string;
    companyAnalysisId: string;
    companyName:       string;
    jobRole:           string;
    template:          unknown;
    createdAt:         Date;
  }) {
    const parsed = (template.template ?? { stages: [] }) as EvaluationTemplateData;

    return {
      id:                template.id,
      companyAnalysisId: template.companyAnalysisId,
      companyName:       template.companyName,
      jobRole:           template.jobRole,
      createdAt:         template.createdAt,
      ...parsed,
    };
  }
}
