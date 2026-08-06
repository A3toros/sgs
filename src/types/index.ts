// Teacher Configuration types for Selenium Script Generator
export interface TeacherConfig {
  id: string
  name: string
  loginUrl: string
  targetUrl: string
  username: string
  password: string
  subjectValue: string
  groupValue: string
  inputPositions: number[]
  checkboxPositions: number[]
  students: StudentData
}

export interface StudentData {
  [studentId: string]: string[]
}

export interface PositionConfig {
  position: number
  enabled: boolean
}

export interface SeleniumConfig {
  teacherId: string
  loginUrl: string
  targetUrl: string
  username: string
  password: string
  subjectValue: string
  groupValue: string
  inputPositions: PositionConfig[]
  checkboxPositions: PositionConfig[]
  students: StudentData
}

export interface SelectOption {
  value: string
  label: string
}

/** Score column on the SGS grid. label is the UI name (e.g. "30", "20"). */
export interface ScoreColumn {
  /** Field key: S1, S9, S10, Final, etc. */
  key: string
  /** Display / points label shown in the UI */
  label: string
  /** Suffix for header checkbox id: Check1 → "1", CheckF → "F" */
  checkSuffix: string
}
