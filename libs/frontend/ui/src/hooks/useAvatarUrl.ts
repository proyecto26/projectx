import { useMemo } from 'react';
import md5 from 'md5';

export const useAvatarUrl = (email?: string) => {
  return useMemo(() => {
    return email
      ? `https://gravatar.com/avatar/${md5(email)}?s=400&d=robohash&r=x`
      : '';
  }, [email]);
};
