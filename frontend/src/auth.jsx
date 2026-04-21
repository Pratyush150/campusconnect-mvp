import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    api.get("/auth/me")
      .then((r) => { setUser(r.data.user); setProfile(r.data.profile); })
      .catch(() => { setUser(null); setProfile(null); });

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  const login = async (email, password) => {
    await api.post("/auth/login", { email, password });
    await refresh();
  };
  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function dashboardPath(role) {
  return { admin: "/admin", client: "/client", doer: "/doer", mentor: "/mentor" }[role] || "/login";
}
