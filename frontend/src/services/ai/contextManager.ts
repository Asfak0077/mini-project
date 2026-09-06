/**
 * CampusResolve Voice AI Agent — Context & Privacy Manager
 * Enforces role-based permissions and isolates guest vs authenticated contexts.
 */

export interface AuthContext {
  isAuthenticated: boolean
  role: 'student' | 'teacher' | 'admin' | 'guest'
  userId: string | null
  userName?: string
  department?: string
}

export class ContextManager {
  public static isActionAllowed(actionType: string, auth: AuthContext): boolean {
    if (auth.isAuthenticated) return true

    // Protected actions that MUST require authentication
    const protectedActions = [
      'SHOW_PENDING',
      'SHOW_HISTORY',
      'CHECK_STATUS',
      'CREATE_COMPLAINT',
      'GIVE_FEEDBACK',
      'UPDATE_FEEDBACK',
      'CONFIRM_ACTION'
    ]

    return !protectedActions.includes(actionType)
  }

  public static getGuestDisclaimer(): string {
    return 'Log in to view your complaints, status updates, feedback history, and personalized AI insights.'
  }

  public static getAuthDisclaimer(): string {
    return 'Personalized assistance enabled.'
  }
}
