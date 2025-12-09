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
 * Format: lumo_<subject>
 */
export function parseWorkspaceName(workspaceName: string): {
  id: string
  name: string
  baseSubject: string
  level?: string | null
} | null {
  const prefix = 'lumo_'
  if (!workspaceName.startsWith(prefix)) return null

  // Remove prefix
  const rest = workspaceName.substring(prefix.length)
  if (!rest) return null

  // New naming format: lumo_{hyphen-separated-subject}_{LEVEL}
  // e.g., lumo_computer-science_O
  let baseSubject = rest
  let suffix = ''
  const lastUnderscore = rest.lastIndexOf('_')
  if (lastUnderscore > -1) {
    baseSubject = rest.substring(0, lastUnderscore)
    suffix = rest.substring(lastUnderscore + 1)
  }

  // Convert hyphenated baseSubject to spaced, Title Case display name
  const subjectName = baseSubject
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')

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

  // Determine level if suffix is single letter O/A
  let level: string | null = null
  if (suffix) {
    const suffixLower = suffix.toLowerCase()
    if (suffixLower === 'o' || suffixLower === 'o-level' || suffixLower === 'olevel') level = 'O'
    else if (suffixLower === 'a' || suffixLower === 'a-level' || suffixLower === 'alevel') level = 'A'
  }

  return {
    id: workspaceName, // Use full workspace name as ID
    name: displayName,
    baseSubject: baseSubject.toLowerCase(),
    level,
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

