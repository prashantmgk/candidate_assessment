import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  useCandidate,
  useSubmitScore,
  useGenerateSummary,
  useUpdateNotes,
  useDeleteCandidate,
} from "../api/candidates";
import { useAuth } from "../hooks/useAuth";

const CATEGORIES = ["Technical Skills", "Communication", "Problem Solving", "Culture Fit"];

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: candidate, isLoading, isError, error } = useCandidate(id);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate("/candidates")} className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to candidates
        </button>
        {isAdmin && candidate && candidate.status !== "archived" && <DeleteCandidateButton candidateId={id} />}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {isLoading && <div className="text-sm text-slate-500">Loading candidate…</div>}

        {isError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error.message || "Failed to load candidate."}
          </div>
        )}

        {candidate && (
          <>
            <ProfileCard candidate={candidate} />
            <ScoresSection candidate={candidate} candidateId={id} />
            <AISummarySection candidateId={id} initialSummary={candidate.ai_summary} />
            {isAdmin && <AdminNotesPanel candidateId={id} initialNotes={candidate.internal_notes} />}
          </>
        )}
      </main>
    </div>
  );
}

function ProfileCard({ candidate }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{candidate.name}</h1>
          <p className="text-sm text-slate-500">{candidate.email}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
          {candidate.status}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Role applied</dt>
          <dd className="text-slate-900">{candidate.role_applied}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Skills</dt>
          <dd className="text-slate-900">{(candidate.skills || []).join(", ") || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}

function ScoresSection({ candidate, candidateId }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { category: CATEGORIES[0], score: 3, note: "" },
  });
  const { mutate: submitScore, isPending, error: submitError } = useSubmitScore(candidateId);

  const onSubmit = (values) => {
    submitScore(values, {
      onSuccess: () => reset({ category: CATEGORIES[0], score: 3, note: "" }),
    });
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Scores</h2>

      {(candidate.scores || []).length === 0 && (
        <p className="text-sm text-slate-500">No scores yet.</p>
      )}

      <ul className="divide-y divide-slate-100">
        {(candidate.scores || []).map((s) => (
          <li key={s.id} className="py-2 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-slate-900">{s.category}</span>
              {s.note && <span className="text-slate-500 ml-2">— {s.note}</span>}
            </div>
            <span className="font-semibold text-slate-900">{s.score}/5</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit(onSubmit)} className="border-t border-slate-100 pt-4 space-y-3">
        <h3 className="text-xs font-medium text-slate-600 uppercase">Submit a score</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select {...register("category", { required: true })} className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Score (1–5)</label>
            <select
              {...register("score", { required: true, valueAsNumber: true })}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            >
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
          <textarea
            {...register("note")}
            rows={2}
            className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            placeholder="Any context for this score…"
          />
        </div>

        {submitError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {submitError.message || "Failed to submit score."}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-1.5 hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? "Submitting…" : "Submit score"}
        </button>
      </form>
    </section>
  );
}

function AISummarySection({ candidateId, initialSummary }) {
  const { mutate: generate, data, isPending, isError, error } = useGenerateSummary(candidateId);
  const summary = data?.summary ?? initialSummary;

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">AI Summary</h2>
        <button
          onClick={() => generate()}
          disabled={isPending}
          className="text-sm bg-slate-100 text-slate-900 font-medium rounded-md px-3 py-1.5 hover:bg-slate-200 disabled:opacity-60"
        >
          {isPending ? "Generating…" : summary ? "Regenerate" : "Generate summary"}
        </button>
      </div>

      {isPending && (
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          Generating summary — this takes a couple of seconds…
        </div>
      )}

      {isError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error.message || "Failed to generate summary. Please try again."}
        </div>
      )}

      {!isPending && summary && (
        <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
      )}

      {!isPending && !summary && !isError && (
        <p className="text-sm text-slate-500">No summary generated yet.</p>
      )}
    </section>
  );
}

function AdminNotesPanel({ candidateId, initialNotes }) {
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit } = useForm({ defaultValues: { internal_notes: initialNotes || "" } });
  const { mutate: updateNotes, isPending } = useUpdateNotes(candidateId);

  const onSubmit = (values) => {
    updateNotes(values.internal_notes, { onSuccess: () => setEditing(false) });
  };

  return (
    <section className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-amber-900">Internal Notes (Admin only)</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-sm text-amber-800 hover:underline">
            Edit
          </button>
        )}
      </div>

      {!editing && (
        <p className="text-sm text-amber-900 whitespace-pre-wrap">
          {initialNotes || "No internal notes yet."}
        </p>
      )}

      {editing && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <textarea
            {...register("internal_notes")}
            rows={4}
            className="w-full rounded-md border border-amber-300 text-sm px-2 py-1.5"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-amber-900 text-white text-sm font-medium rounded-md px-3 py-1.5 hover:bg-amber-800 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-amber-800 hover:underline">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function DeleteCandidateButton({ candidateId }) {
  const navigate = useNavigate();
  const { mutate: deleteCandidate, isPending, isError, error } = useDeleteCandidate();

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this candidate?")) {
      deleteCandidate(candidateId, {
        onSuccess: () => navigate("/candidates"),
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isError && <span className="text-xs text-red-600">{error.message || "Failed to delete"}</span>}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm bg-red-50 text-red-700 font-medium rounded-md px-3 py-1.5 hover:bg-red-100 border border-red-200 disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Delete Candidate"}
      </button>
    </div>
  );
}