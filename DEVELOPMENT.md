# Development Guide 🛠️

A guide for developers who want to extend or customize QuickConnects.

## Architecture Overview

### Next.js App Router Structure

```
app/
├── page.tsx                 # Landing page (/)
├── layout.tsx               # Root layout with globals
├── globals.css              # Tailwind + custom styles
├── auth/                    # Public auth pages
│   ├── login/
│   └── signup/
├── dashboard/               # Protected routes
│   ├── brand/              # Brand-specific pages
│   └── influencer/         # Influencer-specific pages
└── api/                     # API routes
    ├── brands/
    ├── influencers/
    └── deals/
```

## Key Concepts

### 1. Role-Based Access

The app has two user roles: `brand` and `influencer`

**Current Implementation (Demo):**
- Stored in `localStorage`
- Keys: `userRole` and `userId`

**Production Implementation:**
```typescript
// Replace localStorage with:
// - NextAuth.js session
// - JWT tokens
// - Server-side session management
```

### 2. Data Flow

**Current (Prototype):**
```
Component → Import sample data → Render
```

**Production:**
```
Component → API Route → Database → Return data → Render
```

### 3. Component Structure

```typescript
// Client Component Example
"use client";

import { useState } from "react";
import { Component } from "@/components/ui/component";

export default function Page() {
  // Component logic
}
```

## Making Changes

### Adding a New Brand

Edit `data/sample-data.ts`:

```typescript
export const sampleBrands: Brand[] = [
  {
    id: "brand-new",
    userId: "user-brand-new",
    companyName: "Your Company",
    industry: "Your Industry",
    description: "Company description",
    website: "https://example.com",
    budgetRange: "$5K - $20K",
    requirements: ["Requirement 1", "Requirement 2"],
    pastCampaigns: []
  },
  // ... existing brands
];
```

### Adding a New Influencer

Edit `data/sample-data.ts`:

```typescript
export const sampleInfluencers: Influencer[] = [
  {
    id: "inf-new",
    userId: "user-inf-new",
    name: "Influencer Name",
    bio: "Bio description",
    niches: ["Niche1", "Niche2"],
    platforms: [
      { platform: "Instagram", handle: "@handle", followers: 100000 }
    ],
    location: "City, State",
    engagementRate: 5.0,
    rateCard: {
      postPrice: 2000,
      storyPrice: 600,
      videoPrice: 3500
    },
    portfolio: []
  },
  // ... existing influencers
];
```

### Adding a New Page

1. Create file in appropriate directory:
```typescript
// app/dashboard/brand/analytics/page.tsx
"use client";

import { DashboardNav } from "@/components/layout/dashboard-nav";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />
      <div className="container mx-auto px-4 py-8">
        <h1>Analytics</h1>
        {/* Your content */}
      </div>
    </div>
  );
}
```

2. Add to navigation in `components/layout/dashboard-nav.tsx`:
```typescript
const brandNavItems: NavItem[] = [
  // ... existing items
  {
    label: "Analytics",
    href: "/dashboard/brand/analytics",
    icon: <BarChart className="w-4 h-4" />
  },
];
```

### Creating a New UI Component

```typescript
// components/ui/alert.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

export function Alert({
  className,
  variant = "default",
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variant === "destructive" && "border-red-500 bg-red-50",
        className
      )}
      {...props}
    />
  );
}
```

### Adding an API Route

```typescript
// app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sampleMessages } from "@/data/sample-data";

export async function GET(request: NextRequest) {
  const dealId = request.nextUrl.searchParams.get("dealId");

  const messages = dealId
    ? sampleMessages.filter(m => m.dealId === dealId)
    : sampleMessages;

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const newMessage = {
    id: `msg-${Date.now()}`,
    ...body,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(newMessage, { status: 201 });
}
```

## Styling Guide

### Using Tailwind Classes

```tsx
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  {/* Content */}
</div>
```

### Custom Colors

Defined in `app/globals.css`:
```css
:root {
  --primary: 262 83% 58%;        /* Purple */
  --secondary: 210 40% 96.1%;    /* Light gray */
  /* ... */
}
```

Use in components:
```tsx
<div className="bg-primary text-primary-foreground">
  Primary colored element
</div>
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

Breakpoints:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px
- `2xl:` - 1536px

## State Management

### Local State (useState)

```typescript
const [filter, setFilter] = useState<string>("all");
```

### URL Parameters

```typescript
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const influencerId = searchParams.get("influencer");
```

### localStorage (Current Auth)

```typescript
// Set
localStorage.setItem("userRole", "brand");

// Get
const role = localStorage.getItem("userRole");

// Remove
localStorage.removeItem("userRole");
```

## Type Definitions

All types are in `data/types.ts`:

```typescript
import { Brand, Influencer, Deal, Message } from "@/data/types";
```

### Adding a New Type

```typescript
// data/types.ts
export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: "draft" | "active" | "completed";
}
```

## Common Patterns

### Filtering Data

```typescript
const filteredInfluencers = sampleInfluencers.filter((influencer) => {
  const matchesNiche = selectedNiche
    ? influencer.niches.includes(selectedNiche)
    : true;

  const matchesSearch = searchTerm
    ? influencer.name.toLowerCase().includes(searchTerm.toLowerCase())
    : true;

  return matchesNiche && matchesSearch;
});
```

### Formatting Values

```typescript
import { formatNumber, formatCurrency } from "@/lib/utils";

// 1500000 → "1.5M"
formatNumber(1500000);

// 5000 → "$5,000"
formatCurrency(5000);
```

### Conditional Rendering

```typescript
{deal.status === "pending" && (
  <Button onClick={handleAccept}>Accept</Button>
)}

{deals.length === 0 ? (
  <EmptyState />
) : (
  <DealsList deals={deals} />
)}
```

## Database Integration (Future)

### Replace Sample Data with API Calls

**Before (Current):**
```typescript
import { sampleInfluencers } from "@/data/sample-data";
const influencers = sampleInfluencers;
```

**After (Production):**
```typescript
const [influencers, setInfluencers] = useState([]);

useEffect(() => {
  fetch("/api/influencers")
    .then(res => res.json())
    .then(data => setInfluencers(data));
}, []);
```

### Database Schema Example

```sql
-- PostgreSQL schema example
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  description TEXT,
  website VARCHAR(255),
  budget_range VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  location VARCHAR(100),
  engagement_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  influencer_id UUID REFERENCES influencers(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  compensation DECIMAL(10,2),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### Manual Testing Checklist

- [ ] Sign up as brand
- [ ] Sign up as influencer
- [ ] Browse discovery page
- [ ] Filter by niche/industry
- [ ] Search functionality
- [ ] View deal details
- [ ] Send message
- [ ] Switch between accounts
- [ ] Mobile responsive
- [ ] All navigation links

### Unit Testing (Future)

```typescript
// __tests__/utils.test.ts
import { formatNumber, formatCurrency } from "@/lib/utils";

describe("formatNumber", () => {
  it("formats millions correctly", () => {
    expect(formatNumber(1500000)).toBe("1.5M");
  });
});
```

## Performance Optimization

### Image Optimization

```typescript
import Image from "next/image";

<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={64}
  height={64}
  className="rounded-full"
/>
```

### Code Splitting

Next.js automatically code splits by route. For manual splitting:

```typescript
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <p>Loading...</p>,
});
```

### Memoization

```typescript
import { useMemo } from "react";

const filteredData = useMemo(() => {
  return data.filter(/* expensive operation */);
}, [data, filterValue]);
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import to Vercel
3. Deploy automatically

### Other Platforms

```bash
# Build
npm run build

# The output is in .next/
# Deploy .next/ folder to your hosting
```

### Environment Variables

Set in deployment platform:
```
DATABASE_URL=...
NEXTAUTH_SECRET=...
```

## Troubleshooting

### "Module not found"
```bash
npm install
```

### "Port 3000 in use"
```bash
npm run dev -- -p 3001
```

### TypeScript errors
```bash
npm run build
# Fix errors shown in output
```

### Styling not working
```bash
# Restart dev server
# Clear browser cache
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)

## Need Help?

1. Check the code comments
2. Review `README.md`
3. Look at similar components
4. Check Next.js documentation

---

Happy coding! 🚀
