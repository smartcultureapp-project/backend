import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { PrismaService } from '@/prisma/prisma.service';

const SaveCompanyInfoSchema = z.object({
  nameEn:        z.string().optional().describe('영문 회사명 (예: Toss, Kakao)'),
  employeeCount: z.string().optional().describe('직원 수 (예: 1500명, 1000-5000)'),
  foundedYear:   z.number().int().optional().describe('설립 연도 (숫자만)'),
  stockTicker:   z.string().optional().describe('상장사 주식 티커 (예: KRX:377300)'),
});

export function createSaveCompanyInfoTool(
  prismaService: PrismaService,
  companyId: string,
) {
  return createTool({
    id:          'save_company_info',
    description: '조사한 회사 기본 정보를 DB에 저장한다. 조사 완료 후 딱 한 번 호출한다.',
    inputSchema: SaveCompanyInfoSchema,
    execute:     async ({ context }) => {
      const updates: Record<string, unknown> = {};

      if (context.nameEn) updates.nameEn = context.nameEn;
      if (context.employeeCount) updates.employeeCount = context.employeeCount;
      if (context.foundedYear != null) updates.foundedYear = context.foundedYear;
      if (context.stockTicker) updates.stockTicker = context.stockTicker;

      if (Object.keys(updates).length === 0) {
        return { success: false, reason: '저장할 항목 없음' };
      }

      await (prismaService as { company: { update: (args: object) => Promise<unknown> } }).company.update({
        where: { id: companyId },
        data:  updates,
      });

      return { success: true, updated: Object.keys(updates) };
    },
  });
}
