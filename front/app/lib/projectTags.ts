export const PROJECT_TAG_OPTIONS_TABLE = 'project_tag_options'

export const DEFAULT_PROJECT_TAGS = [
  'HTML',
  'CSS',
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Express',
  'Python',
  'Django',
  'Flask',
  'Java',
  'Spring',
  'PHP',
  'Laravel',
  'C#',
  '.NET',
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Firebase',
  'Supabase',
  'Docker',
  'Mobile',
  'React Native',
  'Flutter',
  'IoT',
  'IA',
  'Dados',
]

export type ProjectTagOption = {
  id: string
  name: string
  display_order: number | null
  is_active: boolean
}

export function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

export function uniqueTagNames(tags: string[]) {
  return Array.from(new Set(tags.map(normalizeTagName).filter(Boolean)))
}
