import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../api/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(
      { email, password },
      { onSuccess: () => navigate("/candidates", { replace: true }) }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-slate-200 p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Candidate Review Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error.status === 401
              ? "Incorrect email or password."
              : error.message || "Something went wrong. Please try again."}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-slate-900 text-white text-sm font-medium rounded-md py-2
                     hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-slate-500 text-center">
          Need an account?{" "}
          <Link to="/register" className="text-slate-900 font-medium hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}