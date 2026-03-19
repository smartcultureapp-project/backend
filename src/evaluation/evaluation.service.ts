import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EvaluationTemplateData } from './types/evaluation-template.types';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByAnalysisId(companyAnalysisId: string) {
    const template = await this.prisma.evaluationTemplate.findFirst({ where: { companyAnalysisId } });

    if (!template) {
      throw new NotFoundException(`평가 템플릿을 찾을 수 없습니다 (analysisId: ${companyAnalysisId})`);
    }

    return this.formatTemplate(template);
  }

  async findById(id: string) {
    const template = await this.prisma.evaluationTemplate.findUnique({ where: { id } });

    if (!template) {
      throw new NotFoundException(`평가 템플릿(${id})을 찾을 수 없습니다`);
    }

    return this.formatTemplate(template);
  }

  async findBySessionId(sessionId: string) {
    const analysis = await this.prisma.companyAnalysis.findFirst({
      where:  { sessionId },
      select: { id: true },
    });

    if (!analysis) {
      throw new NotFoundException(`세션(${sessionId})의 분석 결과를 찾을 수 없습니다`);
    }

    return this.findByAnalysisId(analysis.id);
  }

  private formatTemplate(template: Record<string, unknown>) {
    let parsed: EvaluationTemplateData = { stages: [] };

    try {
      parsed = JSON.parse(template.template as string) as EvaluationTemplateData;
    } catch {
      this.logger.warn(`템플릿 JSON 파싱 실패: ${template.id}`);
    }

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
