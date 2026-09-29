import z from 'zod';

export const VipVeteranSchema = z.object({
  since: z.date(),
  years: z.number(),
  tier: z.number(),
  title: z.enum(['veteran', 'legend']).nullish(),
  graceEndsAt: z.date().nullish(),
});

export type VipVeteran = z.infer<typeof VipVeteranSchema>;
