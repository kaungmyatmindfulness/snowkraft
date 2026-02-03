/**
 * Study guide data loader
 * Loads study guide markdown files from the filesystem
 */

import fs from 'fs'
import path from 'path'

// ============================================================================
// Types
// ============================================================================

export interface StudyGuideMetadata {
  slug: string
  title: string
  description: string
  filename: string
}

export interface StudyGuide extends StudyGuideMetadata {
  content: string
}

// ============================================================================
// Study Guide Definitions
// ============================================================================

const STUDY_GUIDES: StudyGuideMetadata[] = [
  {
    slug: 'complete',
    title: 'Complete Study Guide',
    description: 'Full comprehensive guide covering all exam domains',
    filename: 'COMPLETE_STUDY_GUIDE.md',
  },
  {
    slug: 'domain-1',
    title: 'Domain 1',
    description: 'Snowflake AI Data Cloud Features & Architecture (25-30%)',
    filename: 'DOMAIN_1_STUDY_GUIDE.md',
  },
  {
    slug: 'domain-2',
    title: 'Domain 2',
    description: 'Account Access & Security (20-25%)',
    filename: 'DOMAIN_2_STUDY_GUIDE.md',
  },
  {
    slug: 'domain-3',
    title: 'Domain 3',
    description: 'Performance Concepts (10-15%)',
    filename: 'DOMAIN_3_STUDY_GUIDE.md',
  },
  {
    slug: 'domain-4',
    title: 'Domain 4',
    description: 'Data Loading & Unloading (10-15%)',
    filename: 'DOMAIN_4_STUDY_GUIDE.md',
  },
  {
    slug: 'domain-5',
    title: 'Domain 5',
    description: 'Data Transformations (20-25%)',
    filename: 'DOMAIN_5_STUDY_GUIDE.md',
  },
  {
    slug: 'domain-6',
    title: 'Domain 6',
    description: 'Data Protection & Sharing (5-10%)',
    filename: 'DOMAIN_6_STUDY_GUIDE.md',
  },
  {
    slug: 'tricky-patterns',
    title: 'Tricky Exam Patterns',
    description: 'Common exam tricks and patterns to watch out for',
    filename: 'TRICKY_EXAM_PATTERNS.md',
  },
]

// Path to study guide directory
const STUDY_GUIDE_DIR = path.join(process.cwd(), 'data', 'study-guide')

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get all study guide metadata (without content)
 */
export function getAllStudyGuides(): StudyGuideMetadata[] {
  return STUDY_GUIDES
}

/**
 * Get a single study guide by slug (includes content)
 */
export function getStudyGuideBySlug(slug: string): StudyGuide | undefined {
  const metadata = STUDY_GUIDES.find((guide) => guide.slug === slug)

  if (metadata === undefined) {
    return undefined
  }

  const filePath = path.join(STUDY_GUIDE_DIR, metadata.filename)

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return {
      ...metadata,
      content,
    }
  } catch {
    console.error(`Failed to read study guide: ${filePath}`)
    return undefined
  }
}

/**
 * Get study guide metadata by slug (without content)
 */
export function getStudyGuideMetadataBySlug(slug: string): StudyGuideMetadata | undefined {
  return STUDY_GUIDES.find((guide) => guide.slug === slug)
}

/**
 * Check if a study guide exists by slug
 */
export function studyGuideExists(slug: string): boolean {
  return STUDY_GUIDES.some((guide) => guide.slug === slug)
}

/**
 * Get all study guide slugs (useful for static generation)
 */
export function getAllStudyGuideSlugs(): string[] {
  return STUDY_GUIDES.map((guide) => guide.slug)
}
