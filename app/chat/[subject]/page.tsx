'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Link from 'next/link'
import { Send,
  Bot,
  User,
  Loader2,
  LogOut,
  MessageSquare,
  Search,
  MoreVertical,
  ArrowLeft,
  BookOpen,
  Trash2,
  Home,
  Plus,
  Edit3,
  X,
  ChevronDown,
} from 'lucide-react'
import { parseWorkspaceName, getSubjectIcon } from '@/app/lib/subject-utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Subject {
  id: string
  name: string
  icon: React.ReactNode
  baseSubject: string
  messageCount?: number
  lastMessage?: string
}

interface ChatSession {
  id: string
  title: string
  subject_id: string
  created_at: string
  updated_at: string
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const subject = params.subject as string
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Parse current subject from URL
  const currentSubject = useMemo(() => {
    const found = subjects.find((s) => s.id === subject)
    if (found) return found

    // Parse from subject ID if not found in loaded subjects
    const workspaceName = subject.startsWith('alphachat_') ? subject : `alphachat_${subject}`
    const parsed = parseWorkspaceName(workspaceName)
    if (parsed) {
      return {
        id: parsed.id,
        name: parsed.name,
        icon: getSubjectIcon(parsed.baseSubject, 'small'),
        baseSubject: parsed.baseSubject,
      }
    }

    // Fallback
    const baseSubject = subject.replace('alphachat_', '').split('_')[0] || 'unknown'
    return {
      id: subject,
      name: subject.replace('alphachat_', '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || subject,
      icon: getSubjectIcon(baseSubject, 'small'),
      baseSubject: baseSubject,
    }
  }, [subject, subjects])

  // Fetch all subjects from workspaces
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true)
        const response = await fetch('/api/workspaces')
        const data = await response.json()

        if (response.ok && Array.isArray(data)) {
          // Filter workspaces that start with 'alphachat_'
          const alphachatWorkspaces = data.filter((ws: any) =>
            ws.name && ws.name.startsWith('alphachat_')
          )

          // Parse workspaces into subjects
          const parsedSubjects: Subject[] = alphachatWorkspaces
            .map((ws: any) => {
              const parsed = parseWorkspaceName(ws.name)
              if (!parsed) return null

              return {
                id: parsed.id,
                name: parsed.name,
                icon: getSubjectIcon(parsed.baseSubject, 'small'),
                baseSubject: parsed.baseSubject,
              }
            })
            .filter((s: Subject | null): s is Subject => s !== null)

          setSubjects(parsedSubjects)
        } else {
          console.error('Failed to fetch workspaces:', data)
        }
      } catch (error) {
        console.error('Error fetching subjects:', error)
      } finally {
        setSubjectsLoading(false)
      }
    }

    fetchSubjects()
  }, [])

  // Fetch workspace for the current subject
  useEffect(() => {
    const fetchWorkspace = async () => {
      // Use the subject ID directly (which should be the workspace name like 'alphachat_physics')
      // If subject is already in the loaded subjects, use that ID, otherwise construct it
      const foundSubject = subjects.find((s) => s.id === subject)
      const workspaceName = foundSubject 
        ? foundSubject.id 
        : (subject.startsWith('alphachat_') ? subject : `alphachat_${subject}`)
      
      try {
        setWorkspaceError(null)
        setWorkspaceId(null) // Reset workspace ID while fetching
        
        const response = await fetch(`/api/workspaces?name=${workspaceName}`)
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error('Response is not JSON. Received:', text.substring(0, 200))
          throw new Error(
            `Server returned ${contentType || 'non-JSON'} response. Check if the API endpoint is correct.`
          )
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}: Failed to fetch workspace`)
        }

        // The API returns the workspace directly (not wrapped in { workspace: ... })
        if (data.id && data.name) {
          // Convert to string to ensure consistency (workspace ID can be number or string)
          setWorkspaceId(String(data.id))
          setWorkspaceError(null) // Clear any previous errors
        } else {
          console.warn('⚠️ Workspace not found in response:', data)
          setWorkspaceError(
            `Workspace "${workspaceName}" not found. Please create it in AnythingLLM with the name "${workspaceName}".`
          )
        }
      } catch (error: any) {
        console.error('❌ Error fetching workspace:', error)
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        })
        setWorkspaceError(error.message || 'Failed to load workspace')
        setWorkspaceId(null)
      }
    }

    // Only fetch workspace if we have a subject and subjects are loaded (or if subject is already in correct format)
    if (subject) {
      // If subjects are still loading, wait a bit, otherwise fetch immediately
      if (!subjectsLoading) {
        fetchWorkspace()
      }
    }
  }, [subject, subjects, subjectsLoading])

  // Load chat sessions when subject changes
  useEffect(() => {
    if (subject) {
      // Reset session when subject changes
      setCurrentSessionId(null)
      loadChatSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject])

  // Show welcome message when subject changes (don't auto-load sessions)
  useEffect(() => {
    if (!sessionsLoading && !currentSessionId) {
      // Always show welcome message when opening a subject
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your ${currentSubject.name} assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ])
      setCurrentSessionId(null) // Reset session ID
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, sessionsLoading])

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
      }
    }

    checkUser()
  }, [router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSubjectDropdownOpen(false)
      }
    }

    if (subjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [subjectDropdownOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubjectChange = (subjectId: string) => {
    setSubjectDropdownOpen(false)
    router.push(`/chat/${subjectId}`)
  }

  // Load chat sessions for current subject
  const loadChatSessions = async () => {
    if (!subject) return
    
    try {
      setSessionsLoading(true)
      const subjectId = subject.startsWith('alphachat_') ? subject : `alphachat_${subject}`
      const response = await fetch(`/api/sessions?subjectId=${encodeURIComponent(subjectId)}`)
      const data = await response.json()

      if (response.ok && data.sessions) {
        setChatSessions(data.sessions)
        
        // If we have a current session, update thread_id
        if (currentSessionId) {
          const currentSession = data.sessions.find((s: any) => s.id === currentSessionId)
          if (currentSession && currentSession.thread_id) {
            setCurrentThreadId(currentSession.thread_id)
          }
        }
      } else {
        console.error('❌ Failed to load sessions:', data.error || 'Unknown error')
        setChatSessions([])
      }
    } catch (error) {
      console.error('❌ Error loading chat sessions:', error)
      setChatSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  // Create a new chat session (only when user clicks "New chat" button)
  const createNewSession = async () => {
    try {
      const subjectId = subject.startsWith('alphachat_') ? subject : `alphachat_${subject}`
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId: subjectId,
          title: 'New Chat',
        }),
      })

      const data = await response.json()

      if (response.ok && data.session) {
        // Add new session to list
        setChatSessions((prev) => [data.session, ...prev])
        // Switch to new session
        setCurrentSessionId(data.session.id)
        // Set thread_id if available
        if (data.session.thread_id) {
          setCurrentThreadId(data.session.thread_id)
        } else {
          setCurrentThreadId(null)
        }
        // Clear messages for new session
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I'm your ${currentSubject.name} assistant. How can I help you today?`,
            timestamp: new Date(),
          },
        ])
        return data.session
      } else {
        console.error('❌ Failed to create session:', data.error || 'Unknown error')
        alert(`Failed to create chat session: ${data.error || 'Unknown error'}`)
        return null
      }
    } catch (error: any) {
      console.error('❌ Error creating chat session:', error)
      alert(`Error creating chat session: ${error.message || 'Unknown error'}`)
      return null
    }
  }

  // Load chat history for a specific session
  const loadChatHistory = async (sessionId: string | null = null) => {
    setLoading(true)
    try {
      const targetSessionId = sessionId || currentSessionId
      
      if (!targetSessionId) {
        // No session, show welcome message
        const welcomeMessage = {
          id: 'welcome',
          role: 'assistant' as const,
          content: `Hello! I'm your ${currentSubject.name} assistant. How can I help you today?`,
          timestamp: new Date(),
        }
        setMessages([welcomeMessage])
        setLoading(false)
        return
      }

      const response = await fetch(`/api/messages?sessionId=${encodeURIComponent(targetSessionId)}`)
      const data = await response.json()

      if (response.ok && data.messages && data.messages.length > 0) {
        // Convert database messages to Message format
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }))
        setMessages(loadedMessages)
      } else {
        // No history, show welcome message
        const welcomeMessage = {
          id: 'welcome',
          role: 'assistant' as const,
          content: `Hello! I'm your ${currentSubject.name} assistant. How can I help you today?`,
          timestamp: new Date(),
        }
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
      // Show welcome message on error
      const welcomeMessage = {
        id: 'welcome',
        role: 'assistant' as const,
        content: `Hello! I'm your ${currentSubject.name} assistant. How can I help you today?`,
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    } finally {
      setLoading(false)
    }
  }

  // Switch to a different session
  const switchSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    
    // Get thread_id from the session
    const session = chatSessions.find((s) => s.id === sessionId)
    if (session && (session as any).thread_id) {
      setCurrentThreadId((session as any).thread_id)
    } else {
      setCurrentThreadId(null)
    }
    
    await loadChatHistory(sessionId)
  }

  // Clear current session and show welcome message
  const clearSession = () => {
    setCurrentSessionId(null)
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your ${currentSubject.name} assistant. How can I help you today?`,
        timestamp: new Date(),
      },
    ])
  }

  // Delete a chat session
  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this chat?')) {
      return
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from list
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId))
        
        // If deleted session was current, clear it and show welcome
        if (currentSessionId === sessionId) {
          clearSession()
        }
      }
    } catch (error) {
      console.error('Error deleting chat session:', error)
    }
  }

  // Update session title
  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      })

      if (response.ok) {
        setChatSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
        )
        setEditingSessionId(null)
      }
    } catch (error) {
      console.error('Error updating session title:', error)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending || !workspaceId) {
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const messageContent = input.trim() 
    setInput('')
    setSending(true) 

    // Ensure we have a session before sending
    let sessionIdToUse = currentSessionId
    if (!sessionIdToUse) {
      // Create a new session only when user sends first message
      const subjectId = subject.startsWith('alphachat_') ? subject : `alphachat_${subject}`
      try {
        const createResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subjectId: subjectId,
            title: 'New Chat',
          }),
        })
        const createData = await createResponse.json()
        if (createResponse.ok && createData.session) {
          sessionIdToUse = createData.session.id
          setCurrentSessionId(sessionIdToUse)
          // Set thread_id if available
          if (createData.session.thread_id) {
            setCurrentThreadId(createData.session.thread_id)
          } else {
            setCurrentThreadId(null)
          }
          setChatSessions((prev) => [createData.session, ...prev])
        } else {
          console.error('❌ Failed to create session:', createData.error)
          throw new Error(createData.error || 'Failed to create session')
        }
      } catch (error: any) {
        console.error('❌ Error creating session:', error)
        alert(`Failed to create chat session: ${error.message || 'Unknown error'}`)
        setSending(false)
        return
      }
    }

    // Save user message to database
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdToUse,
          role: 'user',
          content: messageContent,
        }),
      })
      
      // Reload sessions to update titles and show the new session
      if (sessionIdToUse) {
        // Small delay to ensure message is saved first
        setTimeout(() => {
          loadChatSessions()
        }, 500)
      }
    } catch (error) {
      console.error('Error saving user message:', error)
      // Continue even if save fails
    }

    try {
      // Prepare message history for context
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Send message to AnythingLLM
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          message: messageContent,
          history,
          threadId: currentThreadId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])

      // Save AI message to database
      if (currentSessionId) {
        try {
          await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: currentSessionId,
              role: 'assistant',
              content: aiMessage.content,
            }),
          })
        } catch (error) {
          console.error('Error saving AI message:', error)
          // Continue even if save fails
        }
      }
    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Failed to get response'}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleDeleteMessage = async (messageId: string) => {
    // Don't allow deleting welcome message
    if (messageId === 'welcome') {
      return
    }

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        // Remove message from UI
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
      } else {
        console.error('❌ Failed to delete message:', response.status, data)
        alert(`Failed to delete message: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error)
      alert('Failed to delete message. Please try again.')
    }
  }

  return (
    <div className="flex h-screen bg-[#0b141a] text-white">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } flex flex-col border-r border-[#202c33] bg-[#111b21] transition-all duration-300 ease-in-out`}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="flex h-14 items-center justify-between border-b border-[#202c33] bg-[#111b21] px-3">
              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#202c33]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a3942]">
                    {currentSubject.icon}
                  </div>
                  <div className="flex flex-1 items-center gap-1.5">
                    <p className="text-sm font-medium text-white">
                      {currentSubject.name}
                    </p>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${subjectDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {subjectDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-lg border border-[#2a3942] bg-[#111b21] shadow-xl">
                    <div className="max-h-96 overflow-y-auto py-2">
                      {subjectsLoading ? (
                        <div className="flex items-center justify-center px-4 py-8">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      ) : subjects.length === 0 ? (
                        <div className="px-4 py-3 text-center text-sm text-gray-400">
                          No subjects available
                        </div>
                      ) : (
                        subjects.map((subj) => (
                          <button
                            key={subj.id}
                            onClick={() => handleSubjectChange(subj.id)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              subj.id === subject
                                ? 'bg-[#2a3942] text-white'
                                : 'text-gray-300 hover:bg-[#202c33] hover:text-white'
                            }`}
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
                              {subj.icon}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{subj.name}</p>
                            </div>
                            {subj.id === subject && (
                              <div className="h-2 w-2 rounded-full bg-white"></div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#202c33] hover:text-white"
                  title="Close sidebar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="border-b border-[#202c33] bg-[#111b21] p-3">
              <button
                onClick={createNewSession}
                className="flex w-full items-center gap-3 rounded-lg border border-[#2a3942] bg-[#111b21] px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#202c33] hover:border-[#2a3942]"
              >
                <Plus className="h-4 w-4" />
                <span>New chat</span>
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-[#202c33] bg-[#111b21] p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  className="w-full rounded-lg bg-[#202c33] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
              </div>
            </div>

            {/* Chat Sessions List */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-2 py-2">
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-gray-400">
                      No chat history. Start a new conversation!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {chatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => switchSession(session.id)}
                        className={`group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          currentSessionId === session.id
                            ? 'bg-[#2a3942] text-white'
                            : 'text-gray-300 hover:bg-[#202c33]'
                        }`}
                      >
                        {editingSessionId === session.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => {
                                if (editingTitle.trim()) {
                                  updateSessionTitle(session.id, editingTitle.trim())
                                } else {
                                  setEditingSessionId(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingTitle.trim()) {
                                    updateSessionTitle(session.id, editingTitle.trim())
                                  } else {
                                    setEditingSessionId(null)
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingSessionId(null)
                                }
                              }}
                              className="flex-1 rounded bg-[#202c33] px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gray-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(null)
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            <p className="flex-1 truncate text-sm">
                              {session.title || 'New Chat'}
                            </p>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingSessionId(session.id)
                                  setEditingTitle(session.title || 'New Chat')
                                }}
                                className="rounded p-1 text-gray-400 hover:bg-[#2a3942] hover:text-white"
                                title="Rename"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => deleteSession(session.id, e)}
                                className="rounded p-1 text-gray-400 hover:bg-[#2a3942] hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#202c33] bg-[#0b141a] px-4">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#202c33] hover:text-white"
                title="Open sidebar"
              >
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
                {currentSubject.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {currentSubject.name}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#202c33] hover:text-white"
              title="Go to Dashboard"
            >
              <Home className="h-4 w-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#202c33] hover:text-white"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-[#0b141a] px-4 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {workspaceError && (
              <div className="mb-4 rounded-lg border border-gray-600 bg-[#202c33] p-4">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">Warning:</span>{' '}
                  {workspaceError}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Make sure you have created a workspace named "{currentSubject.name}" in AnythingLLM and that your API key is configured correctly.
                </p>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-400">Loading chat history...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <h2 className="mb-8 text-4xl font-semibold text-white">
                  Where should we begin?
                </h2>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`group flex animate-in fade-in slide-in-from-bottom-2 gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a3942]">
                      <Bot className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#005c4b] text-white'
                        : 'bg-[#202c33] text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                      {message.content}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p
                        className={`text-xs ${
                          message.role === 'user'
                            ? 'text-gray-300'
                            : 'text-gray-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {message.id !== 'welcome' && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a3942]">
                      <User className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                </div>
              ))
            )}

            {sending && (
              <div className="flex animate-in fade-in gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a3942]">
                  <Bot className="h-4 w-4 text-gray-300" />
                </div>
                <div className="rounded-lg bg-[#202c33] px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="border-t border-[#202c33] bg-[#0b141a] px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSend} className="relative">
              <div className="relative flex items-center rounded-2xl border border-[#2a3942] bg-[#202c33] px-4 py-3 shadow-lg transition-all focus-within:border-[#2a3942] focus-within:shadow-xl">
                <Plus className="absolute left-4 h-5 w-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything"
                  className="ml-8 flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
                  disabled={sending || !workspaceId}
                />
                <div className="flex items-center gap-2">
                  {input.trim() && !sending && workspaceId && (
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black transition-opacity hover:opacity-90"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                  {sending && (
                    <div className="flex h-8 w-8 items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              {!workspaceId && !workspaceError && (
                <p className="mt-2 text-center text-xs text-gray-500">
                  Loading workspace...
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
