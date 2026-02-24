# Setup Instructions for PrepMate Chess

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for version control)

Verify installation:
```bash
node --version
npm --version
```

## Installation Steps

### 1. Open the Project

Navigate to the project directory in your terminal:

```bash
cd /Users/aryanachuthan/Desktop/Projects/PrepMate-Chess
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install:
- **Next.js 14** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **chess.js** - Chess logic
- **recharts** - Chart visualization
- **stockfish.js** - Chess engine

### 3. Run Development Server

Start the development server:

```bash
npm run dev
```

You should see output like:
```
> prepmate-chess@0.1.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the PrepMate Chess application with two sections:
- **Left**: Opponent Analysis
- **Right**: Blindfold Chess Training

## Quick Start Guide

### Testing Opponent Analysis

1. In the left panel, enter one of these test IDs:
   - `1234567` (John Doe)
   - `9876543` (Jane Smith)
   - `fide_2000000` (Grandmaster Alex)
   - Any random ID (generates demo data)

2. Click "Search" and watch the rating data and chart appear

3. Observe the trend classification and rating history

### Testing Blindfold Chess Training

1. In the right panel, adjust the engine strength slider (800-3000)

2. Click "Start Training"

3. Try these moves to start the game:
   - `e4` (King's pawn opening)
   - `d4` (Queen's pawn opening)
   - `Nf3` (Knight opening)

4. After each valid move, the engine responds automatically

5. Try "Show Board" to reveal the position, or "Resign Game" to quit

## Available Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## File Structure

All source code is in the `app/` and `components/` directories:

```
PrepMate-Chess/
├── app/
│   ├── api/opponent/route.ts      # Opponent data endpoint
│   ├── api/chess/route.ts         # Chess game endpoint
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main dashboard
│   └── globals.css                # Global styles
├── components/
│   ├── OpponentAnalysis.tsx       # Search & report component
│   └── BlindfoldsTraining.tsx     # Chess training component
└── [config files]
```

## Troubleshooting

### Port Already in Use

If port 3000 is in use:

```bash
npm run dev -- -p 3001
```

### Dependency Issues

If you get dependency errors, try:

```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

Ensure your TypeScript version is correct:

```bash
npx tsc --version
```

## Keyboard Shortcuts

While developing:
- **Ctrl+C** - Stop the development server
- **Click on error** - Navigate to error in editor
- **Hot Reload** - Changes are auto-reloaded in browser

## Browser DevTools

Open DevTools (F12 or Cmd+Option+I) to:
- Inspect network requests to `/api/opponent` and `/api/chess`
- Check console for errors
- Monitor component state in React DevTools (install extension)

## Testing the APIs Directly

You can test the APIs using curl or Postman:

### Test Opponent Analysis API

```bash
curl -X POST http://localhost:3000/api/opponent \
  -H "Content-Type: application/json" \
  -d '{"id":"1234567"}'
```

### Test Chess API - Create Game

```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{"action":"create","engineRating":1600}'
```

### Test Chess API - Make Move

```bash
curl -X POST http://localhost:3000/api/chess \
  -H "Content-Type: application/json" \
  -d '{"action":"move","gameId":"[your-game-id]","move":"e4"}'
```

## Next Steps

After setup, you can:

1. **Customize Colors** - Edit `tailwind.config.ts`
2. **Add Features** - Create new components in `components/`
3. **Modify APIs** - Update routes in `app/api/`
4. **Deploy** - Use Vercel, Netlify, or your preferred platform
5. **Integrate Real APIs** - Replace mock data in `app/api/opponent/route.ts`

## Production Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

### Deploy to Other Platforms

1. Build the project:
   ```bash
   npm run build
   ```

2. Upload the `.next` directory and all source files to your hosting

3. Set environment variables if needed

4. Start with `npm start`

## Support & Documentation

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **chess.js Docs**: https://github.com/jhlywa/chess.js
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Recharts**: https://recharts.org/

## Notes

- The application uses in-memory storage, so data resets on server restart
- Opponent data is cached for 1 hour per ID
- Game sessions expire after 30 minutes of inactivity
- Mock data is used for demonstration (can be replaced with real APIs)

Happy coding! 🚀
