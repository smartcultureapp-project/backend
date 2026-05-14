import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createCompanyEnrichmentAgent } from '../agent/company-enrichment.agent';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCompanyDto } from './dto/create-company.dto';

function logoUrlFromWebsite(website: string): string | undefined {
  try {
    const host = new URL(website).hostname;

    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return undefined;
  }
}

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const logoUrl = dto.website ? logoUrlFromWebsite(dto.website) : undefined;

    const company = await this.prisma.company.create({ data: {
      name:          dto.name,
      nameEn:        dto.nameEn ?? null,
      industry:      dto.industry ?? null,
      description:   dto.description ?? null,
      website:       dto.website ?? null,
      headquarters:  dto.headquarters ?? null,
      employeeCount: dto.employeeCount ?? null,
      foundedYear:   dto.foundedYear ?? null,
      stockTicker:   dto.stockTicker ?? null,
      techBlog:      dto.techBlog ?? null,
      careerPage:    dto.careerPage ?? null,
      logoUrl:       dto.website ? logoUrl : null,
    } });

    this.logger.log(`Company 생성: ${company.name} (${company.id})`);

    return company;
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) throw new NotFoundException(`Company(${id})를 찾을 수 없습니다`);

    return company;
  }

  async findByName(name: string) {
    return this.prisma.company.findUnique({ where: { name } });
  }

  async findAll() {
    return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOrCreate(name: string) {
    const existing = await this.findByName(name);

    if (existing) return existing;

    return this.create({ name } as CreateCompanyDto);
  }

  async repair(id: string) {
    const company = await this.findById(id);
    const updates: Record<string, unknown> = {};

    if (company.website) {
      const newLogo = logoUrlFromWebsite(company.website);

      if (newLogo && newLogo !== company.logoUrl) {
        updates.logoUrl = newLogo;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.company.update({
        where: { id },
        data:  updates as Parameters<typeof this.prisma.company.update>[0]['data'],
      });
    }

    try {
      const agent = createCompanyEnrichmentAgent(this.prisma,
        id,
        company.name,
        company.website);

      const prompt = `회사명: ${company.name}${company.website ? `\n웹사이트: ${company.website}` : ''}\n\n위 회사의 nameEn, description, employeeCount, foundedYear, stockTicker를 조사하여 save_company_info로 저장하세요. description은 공식 소개에서, employeeCount는 공식/신뢰 출처에서만.`;

      await agent.generate(prompt, { maxSteps: 20 });

      const updatedCompany = await this.prisma.company.findUnique({ where: { id } });
      const hasEnrichment = updatedCompany && (
        (updatedCompany.nameEn ?? null) !== (company.nameEn ?? null) ||
        (updatedCompany.description ?? null) !== (company.description ?? null) ||
        (updatedCompany.employeeCount ?? null) !== (company.employeeCount ?? null) ||
        (updatedCompany.foundedYear ?? null) !== (company.foundedYear ?? null) ||
        (updatedCompany.stockTicker ?? null) !== (company.stockTicker ?? null)
      );

      if (Object.keys(updates).length > 0 || hasEnrichment) {
        const updated = await this.prisma.company.findUnique({ where: { id } });

        this.logger.log(`Company repair: ${company.name} - logo=${Object.keys(updates).length > 0}, enrichment=${!!hasEnrichment}`);

        return {
          ...updated ?? company,
          repaired: true,
        };
      }

      return {
        ...company, repaired: false, reason: '수정할 항목 없음',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      return {
        ...company, repaired: false, reason: '수정 실패: ' + message,
      };
    }
  }

  async getSummary(id: string) {
    const company = await this.findById(id);

    const analyses = await this.prisma.companyAnalysis.findMany({
      where:   { companyId: id },
      orderBy: { researchedAt: 'desc' },
    });

    const analysisIds = analyses.map(a => a.id);
    const templates = await this.prisma.evaluationTemplate.findMany({ where: { companyAnalysisId: { in: analysisIds } } });

    const formattedTemplates = templates.map(t => {
      const parsed = (t.template ?? { stages: [] }) as {
        stages: unknown[];
      };

      return {
        id:                t.id,
        companyAnalysisId: t.companyAnalysisId,
        companyName:       t.companyName,
        jobRole:           t.jobRole,
        createdAt:         t.createdAt,
        ...parsed,
      };
    });

    return {
      company:             company,
      analyses,
      evaluationTemplates: formattedTemplates,
    };
  }
}
