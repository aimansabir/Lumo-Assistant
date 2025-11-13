'use client'

import React from 'react'
import {
  BookOpen,
  Calculator,
  Atom,
  FlaskConical,
  Code,
  Globe,
  History,
} from 'lucide-react'

/**
 * Parse workspace name to extract subject information
 * Format: alphachat_<subject> or alphachat_<subject>_<suffix>
 * Examples:
 * - alphachat_physics -> { id: 'alphachat_physics', name: 'Physics', baseSubject: 'physics' }
 * - alphachat_physics_o -> { id: 'alphachat_physics_o', name: 'Physics O Level', baseSubject: 'physics' }
 */
export function parseWorkspaceName(workspaceName: string): {
  id: string
  name: string
  baseSubject: string
} | null {
  if (!workspaceName.startsWith('alphachat_')) {
    return null
  }

  // Remove 'alphachat_' prefix
  const rest = workspaceName.substring('alphachat_'.length)
  if (!rest) return null

  // Split by underscore to get subject and suffix
  const parts = rest.split('_')
  const baseSubject = parts[0]
  const suffix = parts.slice(1).join('_')

  // Capitalize first letter of base subject
  const subjectName =
    baseSubject.charAt(0).toUpperCase() + baseSubject.slice(1)

  // Format display name
  let displayName = subjectName
  if (suffix) {
    // Capitalize suffix and add it
    const suffixFormatted = suffix
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')
    displayName = `${subjectName} ${suffixFormatted}`
  }

  return {
    id: workspaceName, // Use full workspace name as ID
    name: displayName,
    baseSubject: baseSubject.toLowerCase(),
  }
}

/**
 * Get icon for a subject based on base subject name
 */
export function getSubjectIcon(
  baseSubject: string,
  size: 'small' | 'large' = 'small'
): React.ReactNode {
  const className = size === 'small' ? 'h-5 w-5' : 'h-6 w-6'
  const iconMap: Record<string, React.ReactNode> = {
    physics: <Atom className={className} />,
    mathematics: <Calculator className={className} />,
    math: <Calculator className={className} />,
    chemistry: <FlaskConical className={className} />,
    programming: <Code className={className} />,
    code: <Code className={className} />,
    history: <History className={className} />,
    geography: <Globe className={className} />,
  }

  return iconMap[baseSubject.toLowerCase()] || <BookOpen className={className} />
}

/**
 * Get description for a subject based on base subject name
 */
export function getSubjectDescription(baseSubject: string): string {
  const descriptions: Record<string, string> = {
    physics: 'Explore the laws of nature and the universe',
    mathematics: 'Master numbers, equations, and problem-solving',
    math: 'Master numbers, equations, and problem-solving',
    chemistry: 'Discover the building blocks of matter',
    programming: 'Learn to code and build amazing applications',
    code: 'Learn to code and build amazing applications',
    history: 'Journey through time and civilizations',
    geography: 'Explore the world and its wonders',
  }

  return (
    descriptions[baseSubject.toLowerCase()] ||
    `Learn and explore ${baseSubject}`
  )
}

