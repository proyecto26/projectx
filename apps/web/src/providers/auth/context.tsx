import type { UserDto } from "@projectx/models";
import type React from "react";
import {
  createContext,
  type PropsWithChildren,
  useEffect,
  useState,
} from "react";

// Define the shape of the authentication context
export interface AuthContextType {
  isAuthenticated: boolean;
  accessToken?: string;
  user?: UserDto;
}

// Create the AuthContext with an undefined default value
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// Define the props for the AuthProvider component
type AuthProviderProps = PropsWithChildren<{
  value: AuthContextType;
}>;

// AuthProvider component to wrap the application and provide authentication state
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  value,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(value.isAuthenticated);
  const [user, setUser] = useState(value.user);
  const [accessToken, setAccessToken] = useState(value.accessToken);
  // Update state when the value prop changes
  useEffect(() => {
    setIsAuthenticated(value.isAuthenticated);
    setUser(value.user);
    setAccessToken(value.accessToken);
  }, [value]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
