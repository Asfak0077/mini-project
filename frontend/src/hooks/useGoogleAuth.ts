import { signInWithGoogle } from '../services/authService'

/**
 * useGoogleAuth hook (Deprecated direct GIS implementation)
 * Google OAuth is managed via unified Supabase Auth (signInWithGoogle).
 */
export const useGoogleAuth = () => {
    return {
        enabled: true,
        signInWithGoogle
    }
}
