import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthProvider";
import { ProtectedRoute } from "./routes/ProtectedRoutes";
import { queryClient } from "./api/queryClient";

import LoginPage from "./pages/LoginPage";
import CandidateListPage from "./pages/CandidateListPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import RegisterPage from "./pages/RegisterPage";


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/candidates"
              element={
                <ProtectedRoute>
                  <CandidateListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidates/:id"
              element={
                <ProtectedRoute>
                  <CandidateDetailPage />
                </ProtectedRoute>
              }
            />

            {/* default redirect */}
            <Route path="*" element={<Navigate to="/candidates" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}