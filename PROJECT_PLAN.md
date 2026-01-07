# Teacher Configuration Web App - Project Plan

## Overview
Convert the existing HTML interface (`web_interface.html`) into a modern Next.js + TypeScript web application that generates Python Selenium scripts for teacher data entry automation.

## Key Requirements
- **Multi-teacher support**: Support for Alex (with existing data) and Jay (data to be added later)
- **Web-based interface**: No browser automation - pure web app for script generation
- **Netlify deployment**: Serverless deployment ready
- **TypeScript**: Full type safety
- **Modern UI**: Clean, responsive interface using existing component library

## Current State Analysis
- `web_interface.html` contains the original interface
- `selenium_test.py` contains the automation script template
- Need to extract Alex's configuration from HTML and prepare for Jay

## Project Structure
```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page with teacher selection
│   │   ├── teacher-config/
│   │   │   └── page.tsx        # Main configuration interface
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   └── ...
│   ├── lib/
│   │   ├── teacherConfigs.ts   # Teacher configuration data
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── index.ts            # TypeScript type definitions
├── public/                     # Static assets
├── package.json                # Dependencies
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS config
└── netlify.toml               # Netlify deployment config
```

## Features to Implement

### 1. Teacher Management
- Teacher selection dropdown (Alex, Jay)
- Per-teacher configuration storage
- Easy switching between teacher profiles

### 2. Configuration Interface
- Login credentials management
- Subject and group selection
- Input position configuration (checkboxes for enabling/disabling positions)
- Checkbox position configuration
- Student data management (import from file or manual entry)

### 3. Script Generation
- Generate Python Selenium script based on configuration
- Include all teacher-specific settings
- Format student data properly
- Download generated script as .py file

### 4. Data Validation
- Validate student data format
- Check required fields
- Provide user feedback

### 5. UI/UX
- Responsive design
- Clean, professional interface
- Loading states and error handling
- File upload for student data import

## Technology Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Custom UI component library
- **Deployment**: Netlify
- **State Management**: React hooks (useState, useEffect)

## Data Structure

### Teacher Configuration
```typescript
interface TeacherConfig {
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
```

### Student Data
```typescript
interface StudentData {
  [studentId: string]: string[] // Array of scores
}
```

## Implementation Phases

### Phase 1: Project Setup
- Initialize Next.js project in root directory
- Set up TypeScript configuration
- Configure Tailwind CSS
- Set up basic folder structure

### Phase 2: Core Types and Data
- Define TypeScript interfaces
- Extract Alex's configuration from HTML
- Create teacher configuration management

### Phase 3: UI Components
- Build reusable UI components (Button, Input, Select, etc.)
- Create main layout and navigation

### Phase 4: Main Interface
- Build teacher configuration page
- Implement form controls and state management
- Add file upload functionality

### Phase 5: Script Generation
- Implement Python script generation logic
- Add download functionality
- Integrate with teacher configurations

### Phase 6: Testing and Deployment
- Test all functionality locally
- Configure for Netlify deployment
- Deploy and verify

## Migration from HTML
Extract the following from `web_interface.html`:
- Alex's login credentials and settings
- Student data format and sample data
- Subject and group options
- Position configuration logic
- Script generation template

## Success Criteria
- [ ] Clean, responsive web interface
- [ ] Full teacher configuration management
- [ ] Working script generation and download
- [ ] Data validation and error handling
- [ ] Netlify deployment ready
- [ ] TypeScript type safety throughout

## Future Enhancements
- Add more teachers
- Export/import teacher configurations
- Batch script generation
- User authentication
- Configuration history/versioning
