import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    api.get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null));

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    await api.post("/auth/login", { email, password });
    await refresh();
  };
  const signup = async (data) => {
    await api.post("/auth/signup", data);
    await refresh();
  };
  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
