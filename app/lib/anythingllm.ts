/**
 * AnythingLLM API Client
 * Handles communication with AnythingLLM backend
 */

// Get AnythingLLM configuration from environment variables
const ANYTHINGLLM_BASE_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_BASE_URL || 'http://localhost:3001'
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY

if (!ANYTHINGLLM_API_KEY) {
  console.warn('ANYTHINGLLM_API_KEY is not set in environment variables')
}


export interface Workspace {
  id: string
  name: string
  slug: string
  createdAt?: string
  updatedAt?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  response: string
  sources?: Array<{
    title: string
    url?: string
    score?: number
  }>
}

/**
 * Fetch all workspaces from AnythingLLM
 */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  if (!ANYTHINGLLM_API_KEY) {
    console.error('❌ [AnythingLLM] API key is missing!')
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/workspaces`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    // Check content type before parsing
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [AnythingLLM] Error response:', errorText.substring(0, 500))
      
      // If it's HTML, provide a better error message
      if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
        throw new Error(
          `AnythingLLM server returned HTML instead of JSON. Check if the base URL is correct: ${ANYTHINGLLM_BASE_URL}`
        )
      }
      
      throw new Error(
        `Failed to fetch workspaces: ${response.status} ${errorText.substring(0, 200)}`
      )
    }

    // Check if response is JSON
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('❌ [AnythingLLM] Response is not JSON. First 500 chars:', text.substring(0, 500))
      throw new Error(
        `AnythingLLM returned ${contentType} instead of JSON. Check if the endpoint is correct.`
      )
    }

    const data = await response.json()
    
    // Handle different response formats
    let workspaces: Workspace[] = []
    if (Array.isArray(data)) {
      workspaces = data
    } else if (data.workspaces && Array.isArray(data.workspaces)) {
      workspaces = data.workspaces
    } else if (data.data && Array.isArray(data.data)) {
      workspaces = data.data
    }
    
    return workspaces
  } catch (error) {
    console.error('❌ [AnythingLLM] Error fetching workspaces:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}

/**
 * Find a workspace by name (case-insensitive)
 */
export async function findWorkspaceByName(
  name: string
): Promise<Workspace | null> {
  const workspaces = await fetchWorkspaces()
  
  const found = workspaces.find(
    (ws) => ws.name.toLowerCase() === name.toLowerCase()
  )
  
  return found || null
}

/**
 * Send a chat message to a workspace
 */
export async function sendChatMessage(
  workspaceId: string,
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/workspaces/${workspaceId}/chat`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        mode: 'query',
        history: history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [AnythingLLM] Chat error response:', errorText.substring(0, 500))
      
      // If it's HTML, provide a better error message
      if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
        throw new Error(
          `AnythingLLM server returned HTML instead of JSON. Check if the workspace ID and endpoint are correct.`
        )
      }
      
      throw new Error(
        `Failed to send chat message: ${response.status} ${errorText.substring(0, 200)}`
      )
    }

    // Check content type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('❌ [AnythingLLM] Chat response is not JSON:', text.substring(0, 500))
      throw new Error('Server returned non-JSON response')
    }

    const data = await response.json()
    
    return {
      response: data.response || data.text || data.message || '',
      sources: data.sources || [],
    }
  } catch (error) {
    console.error('Error sending chat message:', error)
    throw error
  }
}

/**
 * Get workspace by slug or ID
 */
export async function getWorkspace(
  identifier: string
): Promise<Workspace | null> {
  const workspaces = await fetchWorkspaces()
  return (
    workspaces.find(
      (ws) => ws.id === identifier || ws.slug === identifier
    ) || null
  )
}

/**
 * Create a new workspace
 */
export async function createWorkspace(name: string): Promise<Workspace> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/workspace/new`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create workspace: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.workspace
  } catch (error) {
    console.error('Error creating workspace:', error)
    throw error
  }
}

/**
 * Upload a document to AnythingLLM
 */
export async function uploadDocument(formData: FormData): Promise<{ success: boolean, documents: any[] }> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/document/upload`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to upload document: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error uploading document:', error)
    throw error
  }
}

/**
 * Update workspace embeddings (add/remove documents)
 */
export async function updateWorkspaceEmbeddings(
  slug: string, 
  adds: string[] = [], 
  deletes: string[] = []
): Promise<boolean> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/workspace/${slug}/update-embeddings`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adds,
        deletes,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update embeddings: ${response.status} ${errorText}`)
    }

    return true
  } catch (error) {
    console.error('Error updating embeddings:', error)
    throw error
  }
}

