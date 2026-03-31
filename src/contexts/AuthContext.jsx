import {
  useCallback,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, login as loginRequest } from "../api/auth";
import { AuthContext } from "./auth-context.js";

function getStoredProjectId() {
  const value = localStorage.getItem("selectedProjectId");

  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedProjectId, setSelectedProjectIdState] = useState(() =>
    getStoredProjectId()
  );
  const [loading, setLoading] = useState(false);

  // Updated role mapping for Laravel backend (simple string)
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
    startTransition(() => {
      setUser(null);
      setSelectedProjectIdState(null);
    });
  }, []);

  const fetchMe = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await getMe();
      const nextUser = data.user ?? null;

      startTransition(() => {
        setUser(nextUser);
        setSelectedProjectIdState((currentProjectId) => {
          const allowedProjectIds = nextUser?.projects?.map((p) => p.id) ?? [];

          if (currentProjectId && allowedProjectIds.includes(currentProjectId)) {
            return currentProjectId;
          }

          return nextUser?.projects?.[0]?.id ?? null;
        });
      });

      return data;
    } catch (error) {
      // If 401, axios interceptor handles redirect
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
      // Sanctum session-based login might not return a token if using cookies
      // or might return access_token if using API tokens.
      // The backend I saw earlier returns access_token.
      
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

  useEffect(() => {
    // Attempt to fetch current user on mount to check if session is active
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
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
