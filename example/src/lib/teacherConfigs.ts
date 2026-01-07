import { TeacherConfig } from '@/types'

export const TEACHER_CONFIGS: TeacherConfig[] = [
  {
    id: 'alex',
    name: 'Alex',
    loginUrl: 'https://sgs.bopp-obec.info/sgs',
    targetUrl: 'https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx',
    username: '1010335002949',
    password: '15102523',
    subjectValue: '8366434',
    groupValue: '15',
    inputPositions: [1, 11],
    checkboxPositions: [1, 10],
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
    username: '',
    password: '',
    subjectValue: '8366434',
    groupValue: '15',
    inputPositions: [1, 11],
    checkboxPositions: [1, 10],
    students: {}
  }
]

export const SUBJECT_OPTIONS = [
  { value: '8366434', label: 'M1' },
  { value: '8367161', label: 'M2' },
  { value: '8367614', label: 'M3' },
  { value: '8368013', label: 'M4' },
  { value: '8369114', label: 'M5' },
  { value: '8369416', label: 'M6' }
]

export const GROUP_OPTIONS = [
  { value: '15', label: 'Group 15 (all grades)' },
  { value: '16', label: 'Group 16 (all grades)' },
  { value: '13', label: 'Group 13 (M4, M5, M6 only)' },
  { value: '14', label: 'Group 14 (M4, M5, M6 only)' }
]

export function getTeacherConfig(teacherId: string): TeacherConfig | undefined {
  return TEACHER_CONFIGS.find(config => config.id === teacherId)
}

export function updateTeacherConfig(teacherId: string, updates: Partial<TeacherConfig>): void {
  const config = TEACHER_CONFIGS.find(c => c.id === teacherId)
  if (config) {
    Object.assign(config, updates)
  }
}
