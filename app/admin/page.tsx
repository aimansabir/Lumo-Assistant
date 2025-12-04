'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { 
  Plus, 
  Upload, 
  FileText, 
  RefreshCw, 
  Trash2,
  Shield,
  CheckCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react'
import { parseWorkspaceName } from '@/app/lib/subject-utils'

interface Workspace {
  id: string
  name: string
  slug: string
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  
  // Form states
  const [newSubjectName, setNewSubjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }
      
      // TODO: Add admin role check here if needed
      
      fetchWorkspaces()
      setLoading(false)
    }

    checkUser()
  }, [router])

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/admin/workspaces')
      const data = await res.json()
      if (data.workspaces) {
        setWorkspaces(data.workspaces)
      }
    } catch (error) {
      console.error('Failed to fetch workspaces', error)
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return

    setIsCreating(true)
    try {
      // Format: alphachat_subjectname
      const formattedName = `alphachat_${newSubjectName.toLowerCase().replace(/\s+/g, '_')}`
      
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formattedName })
      })

      if (!res.ok) throw new Error('Failed to create workspace')

      await fetchWorkspaces()
      setNewSubjectName('')
      setUploadStatus({ type: 'success', message: 'Subject created successfully!' })
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Failed to create subject' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedWorkspace) return

    setUploading(true)
    setUploadStatus(null)
    
    const files = Array.from(e.target.files)
    let successCount = 0
    let failCount = 0

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)

        try {
          // 1. Upload document
          const uploadRes = await fetch('/api/admin/documents/upload', {
            method: 'POST',
            body: formData
          })
          
          if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`)
          
          const uploadData = await uploadRes.json()
          
          if (!uploadData.documents || uploadData.documents.length === 0) {
            throw new Error(`No document returned for ${file.name}`)
          }

          const docLocation = uploadData.documents[0].location

          // 2. Update workspace embeddings
          const updateRes = await fetch(`/api/admin/workspaces/${selectedWorkspace.slug}/update-embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adds: [docLocation],
              deletes: []
            })
          })

          if (!updateRes.ok) throw new Error(`Failed to update embeddings for ${file.name}`)
          
          successCount++
        } catch (err) {
          console.error(err)
          failCount++
        }
      }

      if (failCount === 0) {
        setUploadStatus({ type: 'success', message: `Successfully uploaded ${successCount} document(s)!` })
      } else if (successCount > 0) {
        setUploadStatus({ type: 'error', message: `Uploaded ${successCount} files, but ${failCount} failed.` })
      } else {
        setUploadStatus({ type: 'error', message: 'Failed to upload files.' })
      }

    } catch (error: any) {
      console.error(error)
      setUploadStatus({ type: 'error', message: error.message || 'Failed to upload documents' })
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Back to App
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Subject List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Subject</h2>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label htmlFor="subjectName" className="block text-sm font-medium text-gray-700">
                    Subject Name
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      alphachat_
                    </span>
                    <input
                      type="text"
                      id="subjectName"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="physics"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Will be created as: alphachat_{newSubjectName.toLowerCase().replace(/\s+/g, '_')}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isCreating || !newSubjectName}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Subject'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Existing Subjects</h2>
              </div>
              <ul className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {workspaces.map((ws) => {
                  const parsed = parseWorkspaceName(ws.name)
                  const displayName = parsed ? parsed.name : ws.name
                  const isAlphaChat = ws.name.startsWith('alphachat_')
                  
                  if (!isAlphaChat) return null // Only show alphachat workspaces

                  return (
                    <li 
                      key={ws.id}
                      onClick={() => {
                        setSelectedWorkspace(ws)
                        setUploadStatus(null)
                      }}
                      className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedWorkspace?.id === ws.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{displayName}</span>
                        <span className="text-xs text-gray-500 font-mono">{ws.slug}</span>
                      </div>
                    </li>
                  )
                })}
                {workspaces.filter(ws => ws.name.startsWith('alphachat_')).length === 0 && (
                  <li className="px-6 py-4 text-sm text-gray-500 text-center">
                    No subjects found.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Right Column: Workspace Details & Upload */}
          <div className="lg:col-span-2">
            {selectedWorkspace ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {parseWorkspaceName(selectedWorkspace.name)?.name || selectedWorkspace.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Workspace Slug: <span className="font-mono">{selectedWorkspace.slug}</span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {/* Add more actions here if needed */}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Upload Section */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Upload Documents</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload PDF, TXT, DOCX files to train this subject.
                    </p>
                    <div className="mt-6">
                      <label
                        htmlFor="file-upload"
                        className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploading ? (
                          <>
                            <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Plus className="-ml-1 mr-2 h-5 w-5" />
                            Select File
                          </>
                        )}
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          accept=".pdf,.txt,.docx,.md,.csv"
                          multiple
                        />
                      </label>
                    </div>
                  </div>

                  {/* Status Messages */}
                  {uploadStatus && (
                    <div className={`rounded-md p-4 ${
                      uploadStatus.type === 'success' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {uploadStatus.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {uploadStatus.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-50 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">How it works</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Uploading a document adds it to the AnythingLLM vector database.</li>
                            <li>The document is automatically linked (embedded) to this workspace.</li>
                            <li>Users chatting in this subject will get answers based on these documents.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Subject Selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a subject from the list to manage its documents.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
