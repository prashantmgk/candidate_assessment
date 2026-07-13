import { useCurrentUser, useLogout } from "../api/auth";
import { AuthContext } from "../hooks/useAuth";

export function AuthProvider({ children }) {
  const { data: user, isLoading } = useCurrentUser();
  const { mutate: logout } = useLogout();

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}