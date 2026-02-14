# Survey Voting App

A versatile web application for creating and conducting surveys with multiple voting formats. Built with vanilla JavaScript and Supabase.

**Live Demo:** [https://bikerornot.github.io/ClaudeCodeSurvey/](https://bikerornot.github.io/ClaudeCodeSurvey/)

## Features

### Three Survey Types

1. **Image Surveys**
   - Upload multiple images with optional titles
   - Users vote for their favorite image
   - Original aspect ratios preserved
   - Perfect for design choices, photo contests, etc.

2. **Multiple Choice (Select One)**
   - Traditional single-answer questions
   - Clean button interface
   - Ideal for polls and questionnaires

3. **Checkbox Surveys (Select Multiple)**
   - Users can select multiple options
   - Great for gathering preferences or feedback
   - "Select all that apply" format

### Core Functionality

- **Admin Dashboard** - Password-protected area for creating surveys
- **Public Voting** - Clean, simple voting interface
- **Results Display** - Real-time vote counts with percentage bars
- **Duplicate Prevention** - Browser localStorage prevents double-voting
- **Responsive Design** - Works on desktop and mobile devices
- **Dynamic Options** - Add unlimited answer choices to surveys

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Supabase (PostgreSQL database, Storage, Authentication)
- **Hosting:** GitHub Pages

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Note your **Project URL** and **anon public key** from Settings → API

### 2. Set Up Database

Run the SQL script `supabase-setup.sql` in your Supabase SQL Editor:

```sql
-- Creates tables: surveys, images, votes
-- Sets up Row Level Security policies
-- See supabase-setup.sql for full script
```

Add additional columns for new features:

```sql
ALTER TABLE surveys ADD COLUMN description TEXT;
ALTER TABLE surveys ADD COLUMN question TEXT;
ALTER TABLE surveys ADD COLUMN type TEXT DEFAULT 'image';
ALTER TABLE images ADD COLUMN title TEXT;

ALTER TABLE surveys ADD CONSTRAINT valid_survey_type
CHECK (type IN ('image', 'multiple_choice', 'checkbox'));
```

### 3. Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Create new bucket: `survey-images`
3. Enable **Public bucket**
4. Add storage policies (or run SQL from `supabase-setup.sql`)

### 4. Configure Application

Edit `js/config.js` with your Supabase credentials:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const ADMIN_PASSWORD = 'admin123'; // Change this!
```

### 5. Run Locally

Serve the files with any static server:

```bash
# Using Python
python -m http.server 3000

# Using Node.js
npx serve

# Then open http://localhost:3000
```

## Usage

### Creating Surveys

1. Go to `/admin.html`
2. Enter password (default: `admin123`)
3. Select survey type
4. Fill in details:
   - **Image Survey:** Upload images, add optional titles
   - **Multiple Choice:** Enter question and choices
   - **Checkbox:** Enter question and options
5. Click "Create Survey"
6. Copy the vote link to share

### Voting

1. Open the vote link
2. Select your choice(s)
3. Click "Submit Vote"
4. LocalStorage prevents voting again from the same browser

### Viewing Results

1. Access via admin dashboard or direct link
2. See vote counts and percentages
3. Click "Refresh Results" for latest data

## Project Structure

```
survey-app/
├── index.html          # Landing page with survey list
├── admin.html          # Admin dashboard
├── vote.html           # Public voting page
├── results.html        # Results display
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── config.js       # Supabase configuration
│   ├── admin.js        # Admin functionality
│   ├── vote.js         # Voting logic
│   └── results.js      # Results display
└── supabase-setup.sql  # Database setup script
```

## Database Schema

### surveys
- `id` (uuid) - Primary key
- `title` (text) - Survey title
- `description` (text) - Optional description
- `question` (text) - Question for MC/checkbox surveys
- `type` (text) - 'image', 'multiple_choice', or 'checkbox'
- `created_at` (timestamp)

### images
- `id` (uuid) - Primary key
- `survey_id` (uuid) - Foreign key to surveys
- `storage_path` (text) - Supabase storage path (for images)
- `image_url` (text) - Public URL (for images)
- `title` (text) - Image/option title
- `created_at` (timestamp)

### votes
- `id` (uuid) - Primary key
- `survey_id` (uuid) - Foreign key to surveys
- `image_id` (uuid) - Foreign key to images (or choice)
- `created_at` (timestamp)

## Security Notes

- Admin password is stored in plain text in `config.js` - **change it**
- This is a prototype with permissive RLS policies
- For production, implement proper authentication
- Consider rate limiting for vote submissions
- Validate file uploads on server side

## Contributing

This project was built as a learning exercise. Feel free to fork and improve!

## License

MIT License - Feel free to use and modify

---

Built with assistance from Claude Code
