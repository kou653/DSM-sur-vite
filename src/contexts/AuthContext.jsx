import {
  useCallback,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, login as loginRequest, logout as logoutRequest } from "../api/auth";
import { AuthContext } from "./auth-context.js";

function getStoredProjectId() {
  const value = localStorage.getItem("selectedProjectId");

  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function getStoredToken() {
  return localStorage.getItem("token");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedProjectId, setSelectedProjectIdState] = useState(() =>
    getStoredProjectId()
  );
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));

  const role = user?.role ?? null;
  const accessibleProjectIds = useMemo(
    () => user?.projects?.map((project) => project.id) ?? [],
    [user]
  );

  useEffect(() => {
    if (selectedProjectId !== null) {
      localStorage.setItem("selectedProjectId", String(selectedProjectId));
      return;
    }

    localStorage.removeItem("selectedProjectId");
  }, [selectedProjectId]);

  const setSelectedProjectId = useCallback((nextProjectId) => {
    startTransition(() => {
      setSelectedProjectIdState(nextProjectId);
    });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");

    startTransition(() => {
      setUser(null);
      setSelectedProjectIdState(null);
    });
  }, []);

  const fetchMe = useCallback(async () => {
    if (!getStoredToken()) {
      clearAuth();
      return null;
    }

    setLoading(true);

    try {
      const { data } = await getMe();
      const nextUser = data.user ?? null;

      startTransition(() => {
        setUser(nextUser);
        setSelectedProjectIdState((currentProjectId) => {
          const allowedProjectIds = nextUser?.projects?.map((project) => project.id) ?? [];

          if (currentProjectId && allowedProjectIds.includes(currentProjectId)) {
            return currentProjectId;
          }

          return nextUser?.projects?.[0]?.id ?? null;
        });
      });

      return data;
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuth();
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  const login = useCallback(async (credentials) => {
    setLoading(true);

    try {
      const { data } = await loginRequest(credentials);

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      const nextUser = data.user ?? null;
      const firstProjectId = nextUser?.projects?.[0]?.id ?? null;

      startTransition(() => {
        setUser(nextUser);
        setSelectedProjectIdState((currentProjectId) =>
          currentProjectId ?? firstProjectId
        );
      });

      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await logoutRequest();
      }
    } catch {
      // Clear local auth state even if the server token is already invalid.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  useEffect(() => {
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }

    fetchMe().catch(() => {});
  }, [fetchMe]);

  const value = useMemo(
    () => ({
      user,
      role,
      accessibleProjectIds,
      selectedProjectId,
      loading,
      isAuthenticated: Boolean(user),
      setUser,
      setLoading,
      setSelectedProjectId,
      clearAuth,
      fetchMe,
      login,
      logout,
    }),
    [
      user,
      role,
      accessibleProjectIds,
      selectedProjectId,
      loading,
      setSelectedProjectId,
      clearAuth,
      fetchMe,
      login,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
