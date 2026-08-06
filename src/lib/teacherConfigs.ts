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
    students: {
      "51706": ["24", "5"],
      "51707": ["25", "6"],
      "51708": ["12", "6"],
      "51709": ["26", "8"],
      "51710": ["25", "10"],
      "51711": ["23", "8"],
      "51712": ["13", "6"],
      "51713": ["10", "7"],
      "51714": ["9", "5"],
      "51715": ["11", "7"],
      "51716": ["13", "7"],
      "51717": ["24", "9"],
      "51718": ["25", "6"],
      "51719": ["11", "6"],
      "51720": ["23", "9"],
      "51721": ["16", "8"],
      "51722": ["7", "10"],
      "51723": ["15", "4"],
      "51724": ["13", "9"],
      "51725": ["30", "10"],
      "51726": ["21", "8"],
      "51727": ["30", "10"],
      "51728": ["27", "10"]
    }
  },
  {
    id: 'jay',
    name: 'Jay',
    loginUrl: 'https://sgs.bopp-obec.info/sgs',
    targetUrl: 'https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx',
    username: '1010335002956',
    password: 'Pavel1no24',
    subjectValue: '8735440',
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
  { value: '8735440', label: 'Supplementary Mathematics 2 M.1' },
  { value: '8745567', label: 'ค22232 M.2' },
  { value: '8736092', label: 'Supplementary Mathematics 6 M.3' },
  { value: '8736658', label: 'ค31132 M.4' },
  { value: '8745552', label: 'ค32234 M.5' },
  { value: '8737248', label: 'ค30206 M.6' }
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
