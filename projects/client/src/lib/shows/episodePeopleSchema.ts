import { peopleResponseSchema } from '@trakt/api';
import { contractSchema } from '../api/contractSchema.ts';

/** Episode people use the normal cast/crew shape; cast is the episode's guest stars. */
export const episodePeopleSchema = contractSchema(peopleResponseSchema);
