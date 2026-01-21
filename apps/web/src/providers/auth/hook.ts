import { useContext } from "react";

import { AuthContext } from "./context";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useAuthToken = () => {
  const { accessToken } = useAuth();
  return accessToken;
};

export const useAuthUser = () => {
  const { user } = useAuth();
  return user;
};
