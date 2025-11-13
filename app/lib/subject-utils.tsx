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
 * Format: alphachat_<subject> or alphachat_<subject>_<suffix> or alphachat_<subject>-<suffix>
 * Examples:
 * - alphachat_physics -> { id: 'alphachat_physics', name: 'Physics', baseSubject: 'physics' }
 * - alphachat_physics_o -> { id: 'alphachat_physics_o', name: 'Physics O Level', baseSubject: 'physics' }
 * - alphachat_physics-o -> { id: 'alphachat_physics-o', name: 'Physics O Level', baseSubject: 'physics' }
 * - alphachat_physics-a -> { id: 'alphachat_physics-a', name: 'Physics A Level', baseSubject: 'physics' }
 * - alphachat_physics_a -> { id: 'alphachat_physics_a', name: 'Physics A Level', baseSubject: 'physics' }
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

  // Handle both underscore and hyphen separators
  // Split by underscore first, then check for hyphen in parts
  let baseSubject = rest
  let suffix = ''

  // Check if there's a hyphen separator (e.g., physics-o, physics-a)
  if (rest.includes('-')) {
    const hyphenParts = rest.split('-')
    baseSubject = hyphenParts[0]
    suffix = hyphenParts.slice(1).join('-')
  } else {
    // Check for underscore separator
    const parts = rest.split('_')
    baseSubject = parts[0]
    suffix = parts.slice(1).join('_')
  }

  // Capitalize first letter of base subject
  const subjectName =
    baseSubject.charAt(0).toUpperCase() + baseSubject.slice(1)

  // Format display name
  let displayName = subjectName
  if (suffix) {
    // Handle special cases: o, a for O Level and A Level
    const suffixLower = suffix.toLowerCase().trim()
    if (suffixLower === 'o' || suffixLower === 'o-level' || suffixLower === 'olevel') {
      displayName = `${subjectName} O Level`
    } else if (suffixLower === 'a' || suffixLower === 'a-level' || suffixLower === 'alevel') {
      displayName = `${subjectName} A Level`
    } else {
      // For other suffixes, capitalize and format
      const suffixFormatted = suffix
        .split(/[-_]/)
        .map((s) => {
          const sLower = s.toLowerCase()
          if (sLower === 'o') return 'O'
          if (sLower === 'a') return 'A'
          return s.charAt(0).toUpperCase() + s.slice(1)
        })
        .join(' ')
      
      // Check if it ends with "level" and format accordingly
      if (suffixFormatted.toLowerCase().includes('level')) {
        displayName = `${subjectName} ${suffixFormatted}`
      } else {
        displayName = `${subjectName} ${suffixFormatted}`
      }
    }
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

