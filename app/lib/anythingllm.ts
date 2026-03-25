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
  level?: string
  createdAt?: string
  updatedAt?: string
}

export interface WorkspaceConfig {
  similarityThreshold?: number
  openAiTemp?: number
  openAiHistory?: number
  openAiPrompt?: string
  queryRefusalResponse?: string
  chatMode?: 'chat' | 'query'
  topN?: number
}

export interface Document {
  id: number
  docId: string
  filename: string
  docpath: string
  workspaceId: number
  metadata: string
  pinned: boolean
  watched: boolean
  createdAt: string
  lastUpdatedAt: string
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
export async function createWorkspace(name: string, level?: string, config?: Partial<WorkspaceConfig>): Promise<Workspace> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/workspace/new`
    // Default configuration if not provided; enforce query mode and a detailed system prompt
    const defaultConfig: WorkspaceConfig = {
      similarityThreshold: 0.7,
      openAiTemp: 0.7,
      openAiHistory: 20,
      openAiPrompt: `You are a highly capable, expert AI assistant specialized in providing accurate, well-sourced, and pedagogically sound answers using the context of the workspace documents. When answering, follow these rules:\n\n- Use the workspace documents as the primary source of truth; never fabricate facts. If the answer is not supported by the workspace content, say you don't know and encourage the user to provide more context.\n- Provide concise direct answers first (1-3 sentences), then offer a short, clear explanation or step-by-step guidance with examples where helpful.\n- When applicable, include numbered steps, code snippets, or formulas in a human-readable format.\n- Cite the top N sources from the workspace (where available) and include brief citations (title or filename) inline.\n- If the query asks for content outside the workspace scope, politely refuse using the provided 'queryRefusalResponse' value and suggest ways the user can rephrase the question or add relevant documents.\n- Prefer plain language suitable for learners; use progressive disclosure for advanced technical details.\n- Avoid guessing; when uncertain, ask a clarifying question rather than hallucinate.\n\nSystem constraints: Answer length should be pragmatic; when multiple-step answers are given, use bullets or numbered steps and ensure clarity and correctness.`,
      queryRefusalResponse: 'I\'m sorry - I can\'t answer that from the information available. Please provide more documents or ask a question related to the workspace content.',
      chatMode: 'query',
      topN: 4,
    }

    const finalConfig: WorkspaceConfig = {
      ...defaultConfig,
      ...config,
      // Always enforce query mode for newly created workspaces unless explicitly overridden server-side
      chatMode: 'query',
    }
    
    // Build top-level payload expected by AnythingLLM API
    const payload: any = {
      name,
      similarityThreshold: finalConfig.similarityThreshold,
      openAiTemp: finalConfig.openAiTemp,
      openAiHistory: finalConfig.openAiHistory,
      openAiPrompt: finalConfig.openAiPrompt,
      queryRefusalResponse: finalConfig.queryRefusalResponse,
      chatMode: finalConfig.chatMode,
      topN: finalConfig.topN,
    }
    if (level) payload.level = level

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Failed to create workspace: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.workspace
    // Fallback: should not reach here, but throw in case none of the endpoints succeeded
    throw new Error('Failed to create workspace: No endpoint succeeded')
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
 * Delete a document from AnythingLLM system entirely
 */
export async function deleteSystemDocument(docName: string): Promise<boolean> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/system/remove-documents`
    
    // The explicit endpoint used by AnythingLLM to delete storage documents
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ names: [docName] }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      // If endpoint doesn't exist, we might be on a different version, but we should not crash the whole flow.
      console.error(`Failed to delete document from system: ${response.status} ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting document from system:', error)
    return false // Return false to not block the UI if the system delete fails (workspace embed still removed)
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

/**
 * Delete a workspace in AnythingLLM
 * Tries a couple of common DELETE endpoint shapes and returns true if one succeeds.
 */
export async function deleteWorkspace(identifier: string): Promise<boolean> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  const endpoints = [
    `${ANYTHINGLLM_BASE_URL}/workspace/${identifier}`,
    `${ANYTHINGLLM_BASE_URL}/workspaces/${identifier}`,
  ]

  let lastErr: any = null
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        },
      })

      if (res.ok) {
        return true
      } else {
        // If this endpoint wasn't supported, try the next one
        const text = await res.text().catch(() => '')
        lastErr = new Error(`Failed to delete workspace: ${res.status} ${text}`)
        continue
      }
    } catch (err: any) {
      lastErr = err
      continue
    }
  }

  // If none succeeded, throw the last encountered error
  if (lastErr) {
    console.error('Error deleting workspace:', lastErr)
    throw lastErr
  }

  // Should not be reachable but return false as fallback
  return false
}

/**
 * Get documents in a workspace
 */
export async function getWorkspaceDocuments(slug: string): Promise<Document[]> {
  if (!ANYTHINGLLM_API_KEY) {
    throw new Error('ANYTHINGLLM_API_KEY is not configured')
  }

  try {
    const url = `${ANYTHINGLLM_BASE_URL}/workspace/${slug}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch workspace details: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    // The API returns { workspace: [ { ... documents: [] } ] }
    if (data.workspace && Array.isArray(data.workspace) && data.workspace.length > 0) {
      return data.workspace[0].documents || []
    }
    
    return []
  } catch (error) {
    console.error('Error fetching workspace documents:', error)
    throw error
  }
}

