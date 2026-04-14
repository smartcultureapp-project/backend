import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from './evaluation.service';

describe('EvaluationService', () => {
  let service: EvaluationService;
  let prisma: {
    companyAnalysis:    {
      findUnique: jest.Mock;
    };
    session:            {
      findFirst: jest.Mock; findUnique: jest.Mock;
    };
    evaluationTemplate: {
      findFirst: jest.Mock; findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      companyAnalysis: { findUnique: jest.fn() },
      session:         {
        findFirst: jest.fn(), findUnique: jest.fn(),
      },
      evaluationTemplate: {
        findFirst: jest.fn(), findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({ providers: [
      EvaluationService,
      {
        provide: PrismaService, useValue: prisma,
      },
    ] }).compile();

    service = module.get(EvaluationService);
  });

  it('findByAnalysisId: 소유자가 아니면 NotFoundException', async () => {
    prisma.companyAnalysis.findUnique.mockResolvedValue({
      id:        'ca1',
      sessionId: 's1',
    });
    prisma.session.findUnique.mockResolvedValue({
      id:     's1',
      userId: 'other',
    });

    await expect(service.findByAnalysisId('ca1', 'me')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findByAnalysisId: 소유자면 템플릿 반환', async () => {
    prisma.companyAnalysis.findUnique.mockResolvedValue({
      id:        'ca1',
      sessionId: 's1',
    });
    prisma.session.findUnique.mockResolvedValue({
      id:     's1',
      userId: 'me',
    });
    prisma.evaluationTemplate.findFirst.mockResolvedValue({
      id:                't1',
      companyAnalysisId: 'ca1',
      companyName:       'ACME',
      jobRole:           '개발',
      template:          { stages: [] },
      createdAt:         new Date(),
    });

    const out = await service.findByAnalysisId('ca1', 'me');

    expect(out.companyName).toBe('ACME');
    expect(out.stages).toEqual([]);
  });
});
