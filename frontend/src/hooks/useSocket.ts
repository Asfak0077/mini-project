import { useEffect, useRef } from 'react'
import { useToast } from '../components/shared/ToastNotification'
import { useSocket as useSocketContext } from '../context/SocketContext'

interface UseSocketOptions {
    onNewComplaint?: (data: any) => void
    onComplaintAssigned?: (data: any) => void
    onNewAssignment?: (data: any) => void
    onStatusUpdated?: (data: any) => void
    onNewNotification?: () => void
    onSupportTicketEvent?: (data: any) => void
}

const useSocket = (options: UseSocketOptions = {}) => {
    const { socket, connected } = useSocketContext()
    const { showToast } = useToast()

    // Store callbacks in refs to avoid stale closures
    const callbacksRef = useRef(options)
    const showToastRef = useRef(showToast)

    useEffect(() => {
        callbacksRef.current = options
        showToastRef.current = showToast
    }, [options, showToast])

    useEffect(() => {
        if (!socket || !connected) return

        // Listen for events

        // New complaint (for admin)
        const handleNewComplaint = (data: any) => {
            console.log('New complaint received:', data)
            callbacksRef.current.onNewComplaint?.(data)
            showToastRef.current('info', `New complaint from ${data.studentName}`)
            callbacksRef.current.onNewNotification?.()
        }

        // Complaint assigned (for student)
        const handleComplaintAssigned = (data: any) => {
            console.log('Complaint assigned:', data)
            callbacksRef.current.onComplaintAssigned?.(data)
            showToastRef.current('success', `Complaint assigned to ${data.teacherName}`)
            callbacksRef.current.onNewNotification?.()
        }

        // New assignment (for teacher)
        const handleNewAssignment = (data: any) => {
            console.log('New assignment received:', data)
            callbacksRef.current.onNewAssignment?.(data)
            showToastRef.current('info', `New complaint assigned: ${data.category}`)
            callbacksRef.current.onNewNotification?.()
        }

        // Status updated (for student)
        const handleStatusUpdated = (data: any) => {
            console.log('Status updated:', data)
            callbacksRef.current.onStatusUpdated?.(data)
            const message = data.isResolved
                ? 'Your complaint has been resolved!'
                : `Status updated to: ${data.newStatus}`
            showToastRef.current(data.isResolved ? 'success' : 'info', message)
            callbacksRef.current.onNewNotification?.()
        }

        socket.on('new_complaint', handleNewComplaint)
        socket.on('complaint_assigned', handleComplaintAssigned)
        socket.on('new_assignment', handleNewAssignment)
        socket.on('status_updated', handleStatusUpdated)

        const handleSupportTicketEvent = (data: any) => {
            callbacksRef.current.onSupportTicketEvent?.(data)
            callbacksRef.current.onNewNotification?.()
            if (data?.ticketId) {
                showToastRef.current('info', `Support ticket update: ${data.ticketId}`)
            }
        }

        socket.on('support_ticket_created', handleSupportTicketEvent)
        socket.on('support_ticket_assigned', handleSupportTicketEvent)
        socket.on('support_ticket_replied', handleSupportTicketEvent)
        socket.on('support_ticket_resolved', handleSupportTicketEvent)

        return () => {
            socket.off('new_complaint', handleNewComplaint)
            socket.off('complaint_assigned', handleComplaintAssigned)
            socket.off('new_assignment', handleNewAssignment)
            socket.off('status_updated', handleStatusUpdated)
            socket.off('support_ticket_created', handleSupportTicketEvent)
            socket.off('support_ticket_assigned', handleSupportTicketEvent)
            socket.off('support_ticket_replied', handleSupportTicketEvent)
            socket.off('support_ticket_resolved', handleSupportTicketEvent)
        }
    }, [socket, connected])

    return socket
}

export default useSocket
