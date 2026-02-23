test
# Grant Tracker

A web application for tracking grants, deadlines, funding status, and reporting requirements.

## Features

- Add, edit, and delete grant entries
- Track grant status (Prospect, Applied, Awarded, Rejected, Closed)
- Monitor application and reporting deadlines
- Filter and search grants by status, funder, or date
- Dashboard overview of total funding and pipeline

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository
```bash
   git clone https://github.com/your-username/grant-tracker.git
   cd grant-tracker
```

2. Install dependencies
```bash
   npm install
```

3. Set up environment variables
```bash
   cp .env.example .env
```
   Fill in your Supabase URL and API key in the `.env` file.

4. Start the development server
```bash
   npm run dev
```

## Project Structure
```
grant-tracker/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── utils/
├── public/
└── README.md
```

## Roadmap

- [ ] User authentication
- [ ] Email deadline reminders
- [ ] Export grants to CSV
- [ ] Attach documents to grant entries
- [ ] Team collaboration features

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)



