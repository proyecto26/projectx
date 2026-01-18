import React, {
  type ComponentType,
  createContext,
  type PropsWithChildren,
  useContext,
  useReducer,
} from "react";

import { initialState, reducer } from "./reducer";
import type { ContextProps } from "./types";

export const GlobalContext = createContext<ContextProps>([
  initialState,
  () => null,
] as ContextProps);
export const StoreConsumer = GlobalContext.Consumer;

export type StoreProviderProps = PropsWithChildren;

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
  });

  const value = React.useMemo<ContextProps>(
    () => [state, dispatch],
    [state, dispatch],
  );

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
};

export function withStoreProvider<T>(
  WrappedComponent: ComponentType<T>,
): ComponentType<T & StoreProviderProps> {
  return (props: T & StoreProviderProps) => (
    <StoreProvider>
      <WrappedComponent {...props} />
    </StoreProvider>
  );
}

export function useStore() {
  return useContext(GlobalContext);
}

export function useStoreState() {
  return useContext(GlobalContext)?.[0];
}

export function useStoreDispatch() {
  return useContext(GlobalContext)?.[1];
}
