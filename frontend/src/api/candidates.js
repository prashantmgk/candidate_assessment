import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export function useCandidates(filters = {}) {
  const { status, role_applied, skill, keyword, page = 1, page_size = 20 } = filters;

  const params = new URLSearchParams();
  if (status) params.set("status", status?.toLowerCase());
  if (role_applied) params.set("role_applied", role_applied?.toLowerCase());
  if (skill) params.set("skill", skill?.toLowerCase());
  if (keyword) params.set("keyword", keyword?.toLowerCase());
  params.set("page", page);
  params.set("page_size", page_size);

  return useQuery({

    queryKey: ["candidates", { status, role_applied, skill, keyword, page, page_size }],
    queryFn: () => apiFetch(`/candidates?${params.toString()}`),
  });
}

export function useCandidate(id) {
  return useQuery({
    queryKey: ["candidate", id],
    queryFn: () => apiFetch(`/candidates/${id}`),
    enabled: !!id,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiFetch("/candidates", { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidates"] }),
  });
}

export function useSubmitScore(candidateId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiFetch(`/candidates/${candidateId}/scores`, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] }),
  });
}

export function useGenerateSummary(candidateId) {
  // Not persisted server-side (see README ADR #3) - result only lives in
  // this mutation's returned data, so there's nothing to invalidate here.
  // Re-running the mutation is exactly how you "regenerate".
  return useMutation({
    mutationFn: () => apiFetch(`/candidates/${candidateId}/summary`, { method: "POST" }),
  });
}

export function useUpdateNotes(candidateId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (internal_notes) =>
      apiFetch(`/candidates/${candidateId}/notes`, {
        method: "PATCH",
        body: { internal_notes },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] }),
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiFetch(`/candidates/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidates"] }),
  });
}