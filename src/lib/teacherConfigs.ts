import { TeacherConfig, SelectOption, ScoreColumn } from '@/types'

export const TEACHER_CONFIGS: TeacherConfig[] = [
  {
    id: 'alex',
    name: 'Alex',
    loginUrl: 'https://sgs.bopp-obec.info/sgs',
    targetUrl: 'https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx',
    username: '1010335002949',
    password: '15102523',
    subjectValue: '9193949',
    groupValue: '15',
    inputPositions: [1],
    checkboxPositions: [1],
    students: {}
  },
  {
    id: 'jay',
    name: 'Jay',
    loginUrl: 'https://sgs.bopp-obec.info/sgs',
    targetUrl: 'https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx',
    username: '1010335002956',
    password: 'Pavel1no24',
    subjectValue: '9175029',
    groupValue: '15',
    inputPositions: [1],
    checkboxPositions: [1],
    students: {}
  }
]

export const ALEX_SUBJECTS: SelectOption[] = [
  { value: '9193949', label: 'M1 Eng for Comm (อ21235)' },
  { value: '9175319', label: 'M2 Eng for Present (I22201)' },
  { value: '9200342', label: 'M4 Grammar (อ31131)' },
  { value: '9200409', label: 'M4 L&S (อ31231)' },
  { value: '9200423', label: 'M4 Career (อ31237)' },
  { value: '9199298', label: 'M5 Career (อ32237)' },
  { value: '9200051', label: 'M6 Career (อ33237)' }
]

export const JAY_SUBJECTS: SelectOption[] = [
  { value: '9175029', label: 'M1 Supplementary Mathematics 2 (ค21231)' },
  { value: '9175572', label: 'M2 (ค22231)' },
  { value: '9175910', label: 'M3 (ค23231)' },
  { value: '9179120', label: 'M4 (ค31131)' },
  { value: '9179173', label: 'M5 (ค32233)' },
  { value: '9179216', label: 'M6 (ค33233)' }
]

export const GROUP_OPTIONS: SelectOption[] = [
  { value: '15', label: 'Group 15 (all grades)' },
  { value: '16', label: 'Group 16 (all grades)' },
  { value: '13', label: 'Group 13 (M4, M5, M6 only)' },
  { value: '14', label: 'Group 14 (M4, M5, M6 only)' }
]

export type TranscriptMode = 'midterm' | 'finals'

const BASE_SGS_URL = 'https://sgs.bopp-obec.info/sgs'

export const MODE_OPTIONS: SelectOption[] = [
  { value: 'midterm', label: 'Midterm' },
  { value: 'finals', label: 'Finals' }
]

export const MODE_CONFIG: Record<TranscriptMode, {
  targetUrl: string
  columns: ScoreColumn[]
  inputPositions: number[]
  checkboxPositions: number[]
}> = {
  midterm: {
    // Midterm page: S1 (30) and Midterm/กลางภาค (20)
    targetUrl: `${BASE_SGS_URL}/TblTranscripts/Edit-TblTranscripts1-Table.aspx`,
    columns: [
      { key: 'S1', label: '30', checkSuffix: '1' },
      { key: 'Midterm', label: '20', checkSuffix: 'M' }
    ],
    inputPositions: [1],
    checkboxPositions: [1]
  },
  finals: {
    // Finals page: S10 (20), S11 (10), Final/ปลายภาค (20)
    targetUrl: `${BASE_SGS_URL}/TblTranscripts/Edit-TblTranscripts-Table.aspx`,
    columns: [
      { key: 'S10', label: '20', checkSuffix: '10' },
      { key: 'S11', label: '10', checkSuffix: '11' },
      { key: 'Final', label: '20', checkSuffix: 'F' }
    ],
    inputPositions: [10, 11],
    checkboxPositions: [10, 11]
  }
}

export function getTeacherConfig(teacherId: string): TeacherConfig | undefined {
  return TEACHER_CONFIGS.find(config => config.id === teacherId)
}

export function updateTeacherConfig(teacherId: string, updates: Partial<TeacherConfig>): void {
  const config = TEACHER_CONFIGS.find(c => c.id === teacherId)
  if (config) {
    Object.assign(config, updates)
  }
}

export function getSubjectOptionsForTeacher(teacherId: string): SelectOption[] {
  switch (teacherId) {
    case 'alex':
      return ALEX_SUBJECTS
    case 'jay':
      return JAY_SUBJECTS
    default:
      return []
  }
}
