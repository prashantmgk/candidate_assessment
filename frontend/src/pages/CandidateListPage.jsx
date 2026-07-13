import { useForm } from "react-hook-form";
import { useSearchParams, Link } from "react-router-dom";
import { useCandidates } from "../api/candidates";
import { useAuth } from "../hooks/useAuth";

const STATUS_OPTIONS = ["new", "reviewed", "hired", "rejected"];

export default function CandidateListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();

  const filters = {
    status: searchParams.get("status") || "",
    role_applied: searchParams.get("role_applied") || "",
    skill: searchParams.get("skill") || "",
    keyword: searchParams.get("keyword") || "",
    page: Number(searchParams.get("page")) || 1,
    // Read from URL, default to 20, cap it at 50 to match backend limits
    page_size: Math.min(Number(searchParams.get("page_size")) || 20, 50),
  };

  const handlePageSizeChange = (e) => {
    const next = new URLSearchParams(searchParams);
    next.set("page_size", e.target.value);
    next.set("page", "1"); // Always reset to page 1 when changing size
    setSearchParams(next);
  };

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      status: filters.status,
      role_applied: filters.role_applied,
      skill: filters.skill,
      keyword: filters.keyword,
    },
  });

  const { data, isLoading, isError, error } = useCandidates(filters);

  const applyFilters = (values) => {
    const next = new URLSearchParams();
    if (values.status) next.set("status", values.status);
    if (values.role_applied) next.set("role_applied", values.role_applied);
    if (values.skill) next.set("skill", values.skill);
    if (values.keyword) next.set("keyword", values.keyword);
    next.set("page", "1"); // reset to page 1 whenever filters change
    setSearchParams(next);
  };

  const clearFilters = () => {
    reset({ status: "", role_applied: "", skill: "", keyword: "" });
    setSearchParams({});
  };

  const goToPage = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  };

  const candidates = data?.items ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Candidates</h1>
        <button onClick={() => logout()} className="text-sm text-slate-500 hover:text-slate-900">
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <form
          onSubmit={handleSubmit(applyFilters)}
          className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select {...register("status")} className="rounded-md border border-slate-300 text-sm px-2 py-1.5">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role applied</label>
            <input {...register("role_applied")} className="rounded-md border border-slate-300 text-sm px-2 py-1.5" placeholder="e.g. Frontend Engineer" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Skill</label>
            <input {...register("skill")} className="rounded-md border border-slate-300 text-sm px-2 py-1.5" placeholder="e.g. React" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Keyword</label>
            <input {...register("keyword")} className="rounded-md border border-slate-300 text-sm px-2 py-1.5" placeholder="Search name" />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-1.5 hover:bg-slate-800">
              Apply
            </button>
            <button type="button" onClick={clearFilters} className="text-sm text-slate-500 hover:text-slate-900 px-2">
              Clear
            </button>
          </div>
        </form>

        {isLoading && <div className="text-sm text-slate-500">Loading candidates…</div>}

        {isError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error.message || "Failed to load candidates."}
          </div>
        )}

        {!isLoading && !isError && candidates.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-12">No candidates match these filters.</div>
        )}

        {!isLoading && candidates.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Role applied</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Skills</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link to={`/candidates/${c.id}`} className="text-slate-900 font-medium hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.role_applied}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{(c.skills || []).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

{!isLoading && candidates.length > 0 && (
          <div className="flex items-center justify-between text-sm pt-4 border-t border-slate-200">
            {/* New rows-per-page dropdown */}
            <div className="flex items-center gap-2 text-slate-500">
              <label htmlFor="pageSize">Rows per page:</label>
              <select
                id="pageSize"
                value={filters.page_size}
                onChange={handlePageSizeChange}
                className="border border-slate-300 rounded-md py-1 px-2 bg-white text-slate-900"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-4">
              <span className="text-slate-500">
                Showing page <span className="font-medium text-slate-900">{filters.page}</span> of <span className="font-medium text-slate-900">{Math.ceil((data?.total || 0) / filters.page_size) || 1}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => goToPage(filters.page - 1)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  // Fixed logic: Disable if current page >= total pages
                  disabled={filters.page >= (Math.ceil((data?.total || 0) / filters.page_size) || 1)}
                  onClick={() => goToPage(filters.page + 1)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}