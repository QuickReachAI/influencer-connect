# Quick Start Guide 🚀

Get QuickConnects running in 3 minutes!

## Step 1: Install Dependencies

```bash
cd quick-connects
npm install
```

This will install all required packages including Next.js, React, Tailwind CSS, and UI components.

## Step 2: Run the Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

## Step 3: Try the Demo

### Option A: Brand Experience

1. Click **"Get Started"** or **"I'm a Brand"** on the homepage
2. Sign up with any email (e.g., `brand@test.com`)
3. Enter any password (demo mode)
4. Explore the brand dashboard:
   - Browse influencers in **"Find Influencers"**
   - View sample deals in **"My Deals"**
   - Check messages in **"Messages"**

### Option B: Influencer Experience

1. Click **"I'm an Influencer"** on the homepage
2. Sign up with any email (e.g., `influencer@test.com`)
3. Enter any password (demo mode)
4. Explore the influencer dashboard:
   - Discover brands in **"Find Brands"**
   - Review offers in **"My Deals"**
   - Chat with brands in **"Messages"**

### Option C: Quick Login

Use the pre-configured demo credentials:

**Brand Account:**
- Email: `brand@example.com`
- Password: any

**Influencer Account:**
- Email: `influencer@example.com`
- Password: any

## Key Features to Test

✅ **Discovery System**: Search and filter by niche/industry
✅ **Deal Management**: View pending, active, and completed deals
✅ **Messaging**: Real-time chat interface between brands and influencers
✅ **Profiles**: Detailed brand and influencer information
✅ **Analytics**: Dashboard stats and metrics

## Project Commands

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## What's Included

- 5 sample brands across various industries
- 8 sample influencers with different niches
- 5 sample deals in various stages
- Pre-built messaging conversations
- Fully responsive design
- Modern UI with Tailwind CSS

## Next Steps

1. Explore the codebase in your editor
2. Check `data/sample-data.ts` to see the data structure
3. Review `README.md` for detailed documentation
4. Customize the design in `app/globals.css`
5. Add your own brands and influencers in the data files

## Customization Tips

### Change Primary Colors
Edit `app/globals.css` and update the `--primary` CSS variables

### Add More Sample Data
Edit `data/sample-data.ts` and add entries to:
- `sampleBrands`
- `sampleInfluencers`
- `sampleDeals`
- `sampleMessages`

### Modify UI Components
All reusable components are in `components/ui/`

## Troubleshooting

**Port 3000 already in use?**
```bash
npm run dev -- -p 3001
```

**Dependencies not installing?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build errors?**
```bash
npm run build
# Check the error output for specific issues
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide Icons** - Beautiful icon library

## Need Help?

- Check `README.md` for comprehensive documentation
- Review the code comments in key files
- Look at the type definitions in `data/types.ts`

---

**Happy coding! 🎉**

Built with ❤️ using Next.js and TypeScript
