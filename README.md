# Teacher Configuration Web App

A Next.js + TypeScript web application for generating Python Selenium scripts to automate teacher data entry tasks.

## Features

- **Multi-teacher support**: Configure settings for different teachers (currently Alex and Jay)
- **Script generation**: Generate customized Python Selenium scripts based on teacher configurations
- **Student data management**: Import student data from files or manual entry
- **Position configuration**: Configure which input fields and checkboxes to fill
- **Download scripts**: Download generated scripts as .py files

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Deployment

This app is configured for deployment on Netlify. Simply connect your repository to Netlify and it will automatically build and deploy.

## Usage

1. Select a teacher from the dropdown (Alex or Jay)
2. Configure the script settings (login URL, credentials, subject/group)
3. Set up input and checkbox positions
4. Import or paste student data
5. Generate and download the Python script

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects to teacher-config)
│   └── teacher-config/
│       └── page.tsx        # Main configuration interface
├── components/
│   └── ui/                 # Reusable UI components
├── lib/
│   └── teacherConfigs.ts   # Teacher configuration data
└── types/
    └── index.ts            # TypeScript type definitions
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React** - UI library
