import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../api/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");
  const navigate = useNavigate();
  const { mutate: register, isPending, error } = useRegister();

  const handleSubmit = (e) => {
    e.preventDefault();
    setClientError("");

    if (password !== confirmPassword) {
      setClientError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setClientError("Password must be at least 8 characters.");
      return;
    }

    register(
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
          <h1 className="text-xl font-semibold text-slate-900">Create reviewer account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registration creates a reviewer account. Admin access is granted separately.
          </p>
        </div>

        {(clientError || error) && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {clientError ||
              (error.status === 409
                ? "An account with that email already exists."
                : error.message || "Something went wrong. Please try again.")}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {isPending ? "Creating account…" : "Create account"}
        </button>

        <p className="text-sm text-slate-500 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-slate-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}