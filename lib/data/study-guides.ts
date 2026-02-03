/**
 * Study guide data loader
 * Loads study guide markdown files from the filesystem
 *
 * Domain guides are split into 16 parts each, loaded individually.
 * Exam guides are single markdown files.
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
  type: 'domain' | 'exam-guide'
}

export interface DomainPart {
  slug: string
  title: string
  partNumber: number
  domain: number
  filename: string
}

export interface StudyGuide {
  slug: string
  title: string
  description: string
  content: string
  partTitle?: string
}

// ============================================================================
// Constants
// ============================================================================

const STUDY_GUIDE_DIR = path.join(process.cwd(), 'assets', 'docs', 'study-guide')
const EXAM_GUIDE_DIR = path.join(process.cwd(), 'assets', 'docs', 'exam-guide')

const DOMAIN_INFO = [
  {
    number: 1,
    title: 'Domain 1',
    description: 'Snowflake AI Data Cloud Features & Architecture (25-30%)',
  },
  { number: 2, title: 'Domain 2', description: 'Account Access & Security (20-25%)' },
  { number: 3, title: 'Domain 3', description: 'Performance Concepts (10-15%)' },
  { number: 4, title: 'Domain 4', description: 'Data Loading & Unloading (10-15%)' },
  { number: 5, title: 'Domain 5', description: 'Data Transformations (20-25%)' },
  { number: 6, title: 'Domain 6', description: 'Data Protection & Sharing (5-10%)' },
]

const EXAM_GUIDES = [
  {
    slug: 'exam-overview',
    title: 'Exam Overview',
    description: 'SnowPro Core certification exam structure and preparation guide',
    filename: '00-exam-overview.md',
  },
  {
    slug: 'confused-concepts',
    title: 'Confused Concepts',
    description: 'Commonly confused Snowflake concepts clarified side by side',
    filename: '01-confused-concepts.md',
  },
  {
    slug: 'scenarios-mnemonics',
    title: 'Scenarios & Mnemonics',
    description: 'Real-world scenarios and memory aids for exam preparation',
    filename: '02-scenarios-and-mnemonics.md',
  },
  {
    slug: 'handson-memorization',
    title: 'Hands-On Memorization',
    description: 'Practical exercises and key facts to commit to memory',
    filename: '03-handson-memorization.md',
  },
]

// ============================================================================
// Helpers
// ============================================================================

function kebabToTitle(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

let _domainParts: DomainPart[] | null = null

function loadDomainParts(): DomainPart[] {
  if (_domainParts !== null) {
    return _domainParts
  }

  try {
    const files = fs
      .readdirSync(STUDY_GUIDE_DIR)
      .filter((f) => f.endsWith('.md'))
      .sort()

    _domainParts = []
    for (const file of files) {
      const match = /^domain-(\d+)-part-(\d+)-(.+)\.md$/.exec(file)
      if (match === null) {
        continue
      }

      const domainStr = match[1]
      const partStr = match[2]
      const titleSlug = match[3]
      if (domainStr === undefined || partStr === undefined || titleSlug === undefined) {
        continue
      }

      const domain = parseInt(domainStr)
      const partNumber = parseInt(partStr)

      _domainParts.push({
        slug: `domain-${String(domain)}-part-${partStr}`,
        title: `Part ${String(partNumber)}: ${kebabToTitle(titleSlug)}`,
        partNumber,
        domain,
        filename: file,
      })
    }
  } catch {
    console.error('Failed to scan study guide directory')
    _domainParts = []
  }

  return _domainParts
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get study guide entries for the listing page (6 domains + 4 exam guides).
 * Domain entries link to their first part.
 */
export function getAllStudyGuides(): StudyGuideMetadata[] {
  const parts = loadDomainParts()

  const domains: StudyGuideMetadata[] = DOMAIN_INFO.map((d) => {
    const firstPart = parts.find((p) => p.domain === d.number && p.partNumber === 1)
    return {
      slug: firstPart?.slug ?? `domain-${String(d.number)}-part-01`,
      title: d.title,
      description: d.description,
      type: 'domain' as const,
    }
  })

  const exams: StudyGuideMetadata[] = EXAM_GUIDES.map((e) => ({
    slug: e.slug,
    title: e.title,
    description: e.description,
    type: 'exam-guide' as const,
  }))

  return [...domains, ...exams]
}

/**
 * Get all valid slugs for static page generation.
 */
export function getAllStudyGuideSlugs(): string[] {
  const partSlugs = loadDomainParts().map((p) => p.slug)
  const examSlugs = EXAM_GUIDES.map((e) => e.slug)
  return [...partSlugs, ...examSlugs]
}

/**
 * Get parts for a specific domain (for sidebar navigation).
 */
export function getPartsForDomain(domainNumber: number): DomainPart[] {
  return loadDomainParts().filter((p) => p.domain === domainNumber)
}

/**
 * Get domain info by number.
 */
export function getDomainInfo(
  domainNumber: number
): { title: string; description: string } | undefined {
  return DOMAIN_INFO.find((d) => d.number === domainNumber)
}

/**
 * Parse domain number from a part slug. Returns null for non-domain slugs.
 */
export function parseDomainFromSlug(slug: string): number | null {
  const match = /^domain-(\d+)-part-\d+$/.exec(slug)
  const domainStr = match?.[1]
  return domainStr !== undefined ? parseInt(domainStr) : null
}

/**
 * Get a study guide by slug (includes content).
 */
export function getStudyGuideBySlug(slug: string): StudyGuide | undefined {
  // Check domain parts
  const part = loadDomainParts().find((p) => p.slug === slug)
  if (part !== undefined) {
    const domain = DOMAIN_INFO.find((d) => d.number === part.domain)
    try {
      const content = fs.readFileSync(path.join(STUDY_GUIDE_DIR, part.filename), 'utf-8')
      return {
        slug: part.slug,
        title: domain?.title ?? `Domain ${String(part.domain)}`,
        description: domain?.description ?? '',
        content,
        partTitle: part.title,
      }
    } catch {
      console.error(`Failed to read study guide part: ${part.filename}`)
      return undefined
    }
  }

  // Check exam guides
  const exam = EXAM_GUIDES.find((e) => e.slug === slug)
  if (exam !== undefined) {
    try {
      const content = fs.readFileSync(path.join(EXAM_GUIDE_DIR, exam.filename), 'utf-8')
      return {
        slug: exam.slug,
        title: exam.title,
        description: exam.description,
        content,
      }
    } catch {
      console.error(`Failed to read exam guide: ${exam.filename}`)
      return undefined
    }
  }

  return undefined
}

/**
 * Get study guide metadata by slug (without content).
 */
export function getStudyGuideMetadataBySlug(slug: string): StudyGuideMetadata | undefined {
  const part = loadDomainParts().find((p) => p.slug === slug)
  if (part !== undefined) {
    const domain = DOMAIN_INFO.find((d) => d.number === part.domain)
    return {
      slug: part.slug,
      title: domain?.title ?? `Domain ${String(part.domain)}`,
      description: domain?.description ?? '',
      type: 'domain',
    }
  }

  const exam = EXAM_GUIDES.find((e) => e.slug === slug)
  if (exam !== undefined) {
    return {
      slug: exam.slug,
      title: exam.title,
      description: exam.description,
      type: 'exam-guide',
    }
  }

  return undefined
}

/**
 * Check if a study guide exists by slug.
 */
export function studyGuideExists(slug: string): boolean {
  return loadDomainParts().some((p) => p.slug === slug) || EXAM_GUIDES.some((e) => e.slug === slug)
}
