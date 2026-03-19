import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCompanySchema = z.object({
  name:        z.string().min(1, '회사명은 필수입니다'),
  nameEn:      z.string().optional(),
  industry:    z.string().optional(),
  description: z.string().optional(),
  website:     z.string().url()
    .optional(),
  headquarters:  z.string().optional(),
  employeeCount: z.string().optional(),
  foundedYear:   z.number().int()
    .optional(),
  stockTicker: z.string().optional(),
  techBlog:    z.string().url()
    .optional(),
  careerPage: z.string().url()
    .optional(),
});

export class CreateCompanyDto extends createZodDto(CreateCompanySchema) {}
