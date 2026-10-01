// src/services/supabase.ts

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3002";

// ============================================================
// STORAGE KEYS
// ============================================================

const ACCESS_TOKEN_KEY = "crossflow_access_token";
const REFRESH_TOKEN_KEY = "crossflow_refresh_token";

// ============================================================
// TYPES
// ============================================================

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  email_confirmed_at?: string;
  created_at?: string;

  /** Provider principal du compte : "email", "google", "github"… */
  provider?: "email" | "google" | "github" | (string & {});

  /**
   * true si le compte possède une identité "email" avec un mot de passe.
   * false pour un compte 100 % OAuth (Google / GitHub) : dans ce cas
   * l'utilisateur peut DÉFINIR un mot de passe sans donner l'actuel.
   */
  hasPassword?: boolean;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
}

export interface AuthResponse {
  user: UserProfile | null;
  session: AuthSession | null;
}

// ============================================================
// TOKEN HELPERS
// ============================================================

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** true si une session est stockée (sans vérifier qu'elle est encore valide). */
export function hasStoredSession(): boolean {
  return Boolean(getAccessToken() || getRefreshToken());
}

function saveSession(session: AuthSession | null): void {
  if (!session) return;

  if (session.access_token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  }

  if (session.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  }
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Lit la date d'expiration (en secondes) d'un JWT, ou null si illisible. */
function readTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) return null;

    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: unknown };

    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/** true si le token expire dans moins de `marginSeconds` secondes. */
function isTokenExpiring(token: string, marginSeconds = 60): boolean {
  const exp = readTokenExpiry(token);

  if (exp === null) return false;

  return exp * 1000 - Date.now() < marginSeconds * 1000;
}

// ============================================================
// TOKEN REFRESH
// ============================================================

let refreshPromise: Promise<boolean> | null = null;

/**
 * Renouvelle l'access token avec le refresh token.
 *
 * - Refresh refusé par le serveur (400 / 401 / 403) : la session est
 *   vraiment invalide → on la supprime.
 * - Erreur réseau ou serveur (5xx) : on GARDE les tokens, pour que
 *   l'utilisateur reste connecté dès que le serveur répond à nouveau.
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          if (
            response.status === 400 ||
            response.status === 401 ||
            response.status === 403
          ) {
            clearSession();
          }

          return false;
        }

        const data = await response.json().catch(() => null);

        if (data?.session?.access_token) {
          saveSession(data.session);
          return true;
        }

        clearSession();
        return false;
      } catch (error) {
        // Réseau coupé, serveur injoignable… on ne déconnecte pas.
        console.error("Error refreshing session:", error);
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

// ============================================================
// API REQUEST
// ============================================================

/** Endpoints pour lesquels un 401 ne doit pas déclencher de refresh. */
const NO_REFRESH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
];

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const canRefresh =
    !NO_REFRESH_ENDPOINTS.some((path) => endpoint.startsWith(path)) &&
    Boolean(getRefreshToken());

  // Refresh proactif : évite une requête vouée à l'échec
  // quand l'access token est déjà expiré (retour après plusieurs heures).
  if (canRefresh && !isRetry) {
    const current = getAccessToken();

    if (!current || isTokenExpiring(current)) {
      await refreshAccessToken();
    }
  }

  const token = getAccessToken();

  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    // Tout 401 sur un endpoint protégé : on tente un refresh, une seule fois.
    if (response.status === 401 && canRefresh && !isRetry) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        return apiRequest<T>(endpoint, options, true);
      }
    }

    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  return data as T;
}

// ============================================================
// SIGN IN
// ============================================================

export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  saveSession(result.session);

  return result;
}

// ============================================================
// SIGN UP
// ============================================================

export async function signUp(
  email: string,
  password: string,
  firstName = "",
  lastName = ""
): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
    }),
  });

  saveSession(result.session);

  return result;
}

// ============================================================
// GOOGLE OAUTH
// ============================================================
//
// 1) On demande au serveur l'URL d'autorisation Google.
// 2) On redirige le navigateur.
// 3) Google → Supabase → revient sur redirectTo avec le hash
//    #access_token=...&refresh_token=... que App.tsx intercepte
//    au démarrage pour stocker la session.

export async function getGoogleAuthUrl(redirectTo?: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/google/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      redirectTo: redirectTo || `${window.location.origin}/`,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || "Could not start Google sign-in");
  }

  return data.url as string;
}

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const url = await getGoogleAuthUrl(redirectTo);
  window.location.href = url;
}

// ============================================================
// GITHUB OAUTH
// ============================================================

export async function getGithubAuthUrl(redirectTo?: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/github/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      redirectTo: redirectTo || `${window.location.origin}/`,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || "Could not start GitHub sign-in");
  }

  return data.url as string;
}

export async function signInWithGithub(redirectTo?: string): Promise<void> {
  const url = await getGithubAuthUrl(redirectTo);
  window.location.href = url;
}

// Stocke la session renvoyée par le hash OAuth.
export function saveOAuthSession(
  accessToken: string,
  refreshToken: string
): void {
  saveSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

// ============================================================
// RESEND VERIFICATION EMAIL
// ============================================================

export async function resendVerificationEmail(): Promise<boolean> {
  try {
    await apiRequest("/api/auth/resend-verification", {
      method: "POST",
    });
    return true;
  } catch (error) {
    console.error("Error resending verification email:", error);
    return false;
  }
}

// ============================================================
// UPDATE / SET PASSWORD
// ============================================================
//
// - Compte avec mot de passe : currentPassword est obligatoire.
// - Compte OAuth sans mot de passe : passer `null` (ou omettre)
//   → le backend définit le mot de passe sans vérification de
//   l'ancien (route à adapter : voir updateUserById côté serveur).

export async function updatePassword(
  currentPassword: string | null,
  newPassword: string
): Promise<void> {
  const body: { currentPassword?: string; newPassword: string } = {
    newPassword,
  };

  if (currentPassword) {
    body.currentPassword = currentPassword;
  }

  await apiRequest("/api/user/password", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ============================================================
// GET CURRENT USER
// ============================================================
//
// Retourne null si aucune session n'est stockée ou si elle est invalide.
// Le refresh de l'access token est géré automatiquement par apiRequest.

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    // Pas d'access token mais un refresh token : apiRequest renouvellera
    // la session avant l'appel.
    if (!hasStoredSession()) {
      return null;
    }

    const response = await apiRequest<{
      success: boolean;
      user: UserProfile;
    }>("/api/user/profile", {
      method: "GET",
    });

    if (response && response.success && response.user) {
      return response.user;
    }

    return null;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

// ============================================================
// UPDATE USER PROFILE
// ============================================================

export async function updateUserProfile(
  profile: Partial<UserProfile>
): Promise<boolean> {
  try {
    const updateData: Record<string, string> = {};

    if (profile.first_name !== undefined) {
      updateData.firstName = profile.first_name;
    }

    if (profile.last_name !== undefined) {
      updateData.lastName = profile.last_name;
    }

    if (profile.avatar_url !== undefined) {
      updateData.avatarUrl = profile.avatar_url;
    }

    if (profile.bio !== undefined) {
      updateData.bio = profile.bio;
    }

    await apiRequest("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
}

// ============================================================
// UPLOAD AVATAR
// ============================================================

export async function uploadAvatar(
  file: File,
  _userId?: string
): Promise<string | null> {
  try {
    if (!file) {
      console.error("No avatar file provided.");
      return null;
    }

    if (!file.type.startsWith("image/")) {
      console.error("The selected file is not an image.");
      return null;
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      console.error("Avatar is too large. Maximum size is 2 MB.");
      return null;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    const data = await apiRequest<{
      success: boolean;
      avatar_url?: string;
      avatarUrl?: string;
    }>("/api/user/avatar", {
      method: "POST",
      body: formData,
    });

    const avatarUrl = data?.avatar_url || data?.avatarUrl;

    if (typeof avatarUrl !== "string" || !avatarUrl) {
      console.error("Server did not return an avatar URL.");
      return null;
    }

    return avatarUrl;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return null;
  }
}

// ============================================================
// DELETE AVATAR
// ============================================================

export async function deleteAvatar(filePathOrUrl: string): Promise<boolean> {
  try {
    if (!filePathOrUrl) return false;

    await apiRequest("/api/user/avatar", {
      method: "DELETE",
      body: JSON.stringify({ filePathOrUrl }),
    });

    return true;
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return false;
  }
}

// ============================================================
// SIGN OUT
// ============================================================

export async function signOut(): Promise<void> {
  try {
    if (getAccessToken()) {
      try {
        await apiRequest("/api/auth/logout", { method: "POST" });
      } catch {
        // ignore : on supprime la session locale quoi qu'il arrive
      }
    }
  } finally {
    clearSession();
  }
}

// ============================================================
// API HEALTH
// ============================================================

export async function checkApiHealth(): Promise<boolean> {
  try {
    await apiRequest("/api/health", { method: "GET" });
    return true;
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
}