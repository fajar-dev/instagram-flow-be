import { z } from 'zod';
import { outputs } from '../../shared/validators/shared.validator';
export const processSchema = z.object({ requestedOutputs: outputs });
