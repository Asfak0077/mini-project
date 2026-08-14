import apiClient from './apiClient'
import { Teacher } from '../types/domain'

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || error?.message || fallback
}

export const fetchTeachers = async (): Promise<Teacher[]> => {
  try {
    const { data } = await apiClient.get('/teachers')
    return Array.isArray(data) ? data : (data?.teachers ?? [])
  } catch (error) {
    console.error('Fetch teachers error:', error)
    throw new Error(getErrorMessage(error, 'Unable to fetch teachers from database.'))
  }
}

export const createTeacher = async (payload: { name: string; department: string; email: string; designation: string }): Promise<Teacher> => {
  try {
    const { data } = await apiClient.post('/teachers', payload)
    return data as Teacher
  } catch (error) {
    console.error('Create teacher error:', error)
    throw new Error(getErrorMessage(error, 'Unable to create teacher record in database.'))
  }
}

export const deleteTeacher = async (id: string) => {
  try {
    const { data } = await apiClient.delete(`/teachers/${id}`)
    return data
  } catch (error) {
    console.error('Delete teacher error:', error)
    throw new Error(getErrorMessage(error, 'Unable to delete teacher from database.'))
  }
}
