import z from 'zod';

export const VipVeteranMemorySchema = z.object({
  title: z.enum(['veteran', 'legend']).nullable(),
  anniversaryYear: z.number().nullable(),
  graceShownOn: z.string().nullable(),
});

export type VipVeteranMemory = z.infer<typeof VipVeteranMemorySchema>;
