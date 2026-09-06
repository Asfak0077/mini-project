/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Navigation Agent
 * 
 * Maps spoken voice commands to campus application routes and maintains the voice session.
 */

import { AgentResponse } from '../workflowTypes'

const ROUTE_MAP: Record<string, { path: string; name: string }> = {
  'dashboard': { path: '/student', name: 'Dashboard' },
  'home': { path: '/student', name: 'Student Dashboard' },
  'my complaints': { path: '/student/history', name: 'Complaint History' },
  'complaints': { path: '/student/history', name: 'Complaint History' },
  'history': { path: '/student/history', name: 'Complaint History' },
  'feedback': { path: '/student/feedback', name: 'Feedback Center' },
  'notifications': { path: '/student/notifications', name: 'Notifications' },
  'profile': { path: '/student/profile', name: 'Profile' },
  'settings': { path: '/student/profile', name: 'Settings' },
  'ai intelligence': { path: '/student/ai-intelligence', name: 'AI Intelligence Hub' },
  'analytics': { path: '/student/ai-intelligence', name: 'Analytics' }
}

export class NavigationAgent {
  public resolveNavigation(spokenText: string): { path: string; name: string } | null {
    const lower = spokenText.toLowerCase().trim()

    for (const [trigger, route] of Object.entries(ROUTE_MAP)) {
      if (
        lower === trigger ||
        lower.includes(`go to ${trigger}`) ||
        lower.includes(`open ${trigger}`) ||
        lower.includes(`navigate to ${trigger}`) ||
        lower.includes(`take me to ${trigger}`) ||
        lower.includes(`show ${trigger}`)
      ) {
        return route
      }
    }
    return null
  }

  public handleNavigation(route: { path: string; name: string }): AgentResponse {
    return {
      workflow: 'NAVIGATION',
      workflowStatus: 'COMPLETED',
      currentStep: 'NAVIGATED',
      expectedInput: null,
      extractedData: { targetPath: route.path },
      missingFields: [],
      screenResponse: `Navigating to **${route.name}**...`,
      voiceResponse: `Navigating to ${route.name}. How else can I help?`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      navigationTarget: route.path,
      action: {
        type: 'NAVIGATE',
        payload: { path: route.path }
      }
    }
  }
}

export const navigationAgent = new NavigationAgent()
