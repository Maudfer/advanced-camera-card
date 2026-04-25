import { z } from 'zod';

export const callConditionSchema = z.object({
  condition: z.literal('call'),
  state: z.enum(['idle', 'connecting_call', 'in_call', 'ending_call']).optional(),
});