import type { ComponentType } from "react";
import { type AuthContextType, AuthProvider } from "./context";

export function withAuthProvider<T>(
  WrappedComponent: ComponentType<T>,
): ComponentType<T & AuthContextType> {
  return (props: T & AuthContextType) => (
    <AuthProvider value={props}>
      <WrappedComponent {...props} />
    </AuthProvider>
  );
}
