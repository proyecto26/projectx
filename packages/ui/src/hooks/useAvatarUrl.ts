import { md5 } from "js-md5";
import { useMemo } from "react";

export const useAvatarUrl = (email?: string) => {
  return useMemo(() => {
    return email
      ? `https://gravatar.com/avatar/${md5(email)}?s=400&d=robohash&r=x`
      : "";
  }, [email]);
};
