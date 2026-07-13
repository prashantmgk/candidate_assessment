import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, setToken, clearToken } from "./client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const body = new URLSearchParams({ username: email, password });
      const data = await apiFetch("/auth/login", { method: "POST", body, isForm: true });
      
      setToken(data.access_token);
      
      const user = await apiFetch("/auth/me");
      
      return { data, user };
    },
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }) => {
      // 1. Register the user
      const data = await apiFetch("/auth/register", { method: "POST", body: { email, password } });
      
      setToken(data.access_token);
      
      const user = await apiFetch("/auth/me");
      
      return { data, user };
    },
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      clearToken();
    },
    onSuccess: () => queryClient.setQueryData(["me"], null),
  });
}