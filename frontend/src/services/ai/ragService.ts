/**
 * CampusResolve Voice AI Agent — Client RAG Service Helper
 * Categorizes knowledge groups into Public Knowledge, Authenticated Student Data, and Admin Telemetry.
 */

export type RAGKnowledgeGroup =
  | 'PUBLIC_KNOWLEDGE'
  | 'AUTHENTICATED_STUDENT_DATA'
  | 'ADMIN_FACULTY_TELEMETRY'

export interface RAGCitation {
  title: string
  category: string
  relevanceScore?: 'High relevance' | 'Medium relevance' | 'Low relevance'
}

export class ClientRAGService {
  public static getKnowledgeGroup(isAuthenticated: boolean, role: string): RAGKnowledgeGroup {
    if (!isAuthenticated) return 'PUBLIC_KNOWLEDGE'
    if (role === 'admin' || role === 'teacher') return 'ADMIN_FACULTY_TELEMETRY'
    return 'AUTHENTICATED_STUDENT_DATA'
  }
}
