import { TeacherConfig, SelectOption } from '@/types'

export const TEACHER_CONFIGS: TeacherConfig[] = [
  {
    id: 'alex',
    name: 'Alex',
    loginUrl: 'https://sgs.bopp-obec.info/sgs',
    targetUrl: 'https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts1-Table.aspx',
    username: '1010335002949',
    password: '15102523',
    subjectValue: '8793865',
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
    username: '1010335002956',
    password: 'Pavel1no24',
    subjectValue: '8735440',
    groupValue: '15',
    inputPositions: [1, 11],
    checkboxPositions: [1, 10],
    students: {}
  }
]

export const ALEX_SUBJECTS: SelectOption[] = [
  { value: '8793865', label: 'อ21232 ภาษาอังกฤษฟัง-พูด 2 ม.1' },
  { value: '8794298', label: 'อ22232 ภาษาอังกฤษฟัง-พูด 4 ม.2' },
  { value: '8794396', label: 'อ23204 ภาษาอังกฤษฟัง-พูด 6 ม.3' },
  { value: '8794533', label: 'อ31238 ภาษาอังกฤษเพื่อการอาชีพ 2 ม.4' },
  { value: '8794852', label: 'อ32238 ภาษาอังกฤษเพื่อการอาชีพ 4 ม.5' },
  { value: '8794987', label: 'อ30218 ภาษาอังกฤษเพื่อการอาชีพ ม.6' }
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
