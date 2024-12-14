# Movie Props Shop

A full-stack web application for browsing and purchasing movie props. Built with React, TypeScript, and Python Flask.

## Features

- 🎬 Browse movie props with detailed information
- 🛒 Shopping cart functionality with quantity management
- 🖨️ Optional print service for prop replicas
- 💰 Dynamic pricing with bulk discounts
- 📊 Admin panel for managing inventory and discounts
- 📄 Automatic invoice generation

## Tech Stack

### Frontend
- React with TypeScript
- Material-UI for styling
- Vite for build tooling
- React Router for navigation
- Context API for state management

### Backend
- Python Flask
- SQLite database
- PDF generation for invoices

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Clone the repository
```bash
git clone git@github.com:SebastianNachtigall/DemoProject1.git
cd DemoProject1
```

2. Set up the backend
```bash
cd backend
pip install -r requirements.txt
python seed_db.py  # Initialize the database
python app.py      # Start the server
```

3. Set up the frontend
```bash
cd frontend
npm install
npm run dev
```

The application should now be running at `http://localhost:5173`, with the backend API at `http://localhost:5000`.

## Project Structure

```
DemoProject1/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   └── config.ts      # Configuration files
│   └── public/            # Static assets
└── backend/               # Flask backend application
    ├── app.py            # Main application file
    ├── seed_db.py        # Database seeding script
    └── requirements.txt   # Python dependencies
```

## Features in Detail

### Shopping Cart
- Add/remove items
- Adjust quantities
- Optional print service for props
- Automatic discount calculation for bulk orders

### Admin Panel
- Manage prop inventory
- Set discount tiers
- View orders and generate invoices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
