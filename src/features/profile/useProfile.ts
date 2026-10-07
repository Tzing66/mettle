import { getProfile } from '@/db/repositories/profile';
import { useDbQuery } from '@/db/useDbQuery';

export function useProfile() {
  return useDbQuery(getProfile, ['profile']);
}
