import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setAuthTokenGetter, useGetMe, getGetMeQueryKey, useLogin, useRegister, User, LoginPayload, RegisterPayload } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("qareeb_token"));
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("qareeb_token"));
  }, []);

  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const login = async (data: LoginPayload) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("qareeb_token", res.token);
    setToken(res.token);
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/");
  };

  const register = async (data: RegisterPayload) => {
    const res = await registerMutation.mutateAsync({ data });
    localStorage.setItem("qareeb_token", res.token);
    setToken(res.token);
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/");
  };

  const logout = () => {
    localStorage.removeItem("qareeb_token");
    setToken(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading: isUserLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
