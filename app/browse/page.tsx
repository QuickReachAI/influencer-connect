"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search, SlidersHorizontal, Star, Clock, CheckCircle2,
    Heart, ArrowUpDown, Grid3x3, List, Sparkles
} from "lucide-react";
import { sampleGigs, enhancedInfluencers, categories } from "@/data/enhanced-sample-data";
import { Gig } from "@/data/enhanced-types";

export default function BrowsePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<string>("relevance");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showFilters, setShowFilters] = useState(true);

    // Filter gigs based on criteria
    const filteredGigs = sampleGigs.filter((gig) => {
        const matchesSearch = !searchQuery ||
            gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            gig.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = !selectedCategory || gig.category === selectedCategory;

        const minPrice = Math.min(...gig.packages.map(p => p.price));
        const matchesPrice = minPrice >= priceRange[0] && minPrice <= priceRange[1];

        const matchesRating = !selectedRating || gig.rating >= selectedRating;

        return matchesSearch && matchesCategory && matchesPrice && matchesRating;
    });

    // Get influencer for a gig
    const getInfluencer = (influencerId: string) => {
        return enhancedInfluencers.find(inf => inf.id === influencerId);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold gradient-text">
                            InfluencerConnect
                        </span>
                    </Link>

                    {/* Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-2xl mx-8">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search for services..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-4"
                            />
                        </div>
                    </div>

                    <nav className="flex items-center gap-3">
                        <Link href="/auth/login">
                            <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
                        </Link>
                        <Link href="/auth/signup">
                            <Button className="bg-primary hover:bg-primary-hover">Join</Button>
                        </Link>
                    </nav>
                </div>

                {/* Mobile Search */}
                <div className="md:hidden px-4 pb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search for services..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12"
                        />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="flex gap-8">
                    {/* Filters Sidebar */}
                    <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
                        <div className="bg-white rounded-lg border p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-semibold text-lg">Filters</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedCategory(null);
                                        setPriceRange([0, 10000]);
                                        setSelectedRating(null);
                                    }}
                                >
                                    Clear All
                                </Button>
                            </div>

                            {/* Category Filter */}
                            <div className="mb-6">
                                <h4 className="font-medium mb-3">Category</h4>
                                <div className="space-y-2">
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setSelectedCategory(
                                                selectedCategory === category.id ? null : category.id
                                            )}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === category.id
                                                    ? 'bg-primary text-white'
                                                    : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h4 className="font-medium mb-3">Budget</h4>
                                <div className="space-y-2">
                                    {[
                                        { label: "Under $1,000", range: [0, 1000] },
                                        { label: "$1,000 - $2,500", range: [1000, 2500] },
                                        { label: "$2,500 - $5,000", range: [2500, 5000] },
                                        { label: "$5,000+", range: [5000, 10000] },
                                    ].map((option) => (
                                        <button
                                            key={option.label}
                                            onClick={() => setPriceRange(option.range as [number, number])}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${priceRange[0] === option.range[0] && priceRange[1] === option.range[1]
                                                    ? 'bg-primary text-white'
                                                    : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rating Filter */}
                            <div className="mb-6">
                                <h4 className="font-medium mb-3">Seller Rating</h4>
                                <div className="space-y-2">
                                    {[5, 4.5, 4, 3.5].map((rating) => (
                                        <button
                                            key={rating}
                                            onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedRating === rating
                                                    ? 'bg-primary text-white'
                                                    : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            <Star className="w-4 h-4 fill-current" />
                                            {rating}+ Stars
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold mb-1">
                                    {selectedCategory
                                        ? categories.find(c => c.id === selectedCategory)?.name
                                        : 'All Services'}
                                </h1>
                                <p className="text-muted-foreground">
                                    {filteredGigs.length} services available
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* View Mode Toggle */}
                                <div className="hidden sm:flex border rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`p-2 rounded ${viewMode === "grid" ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        <Grid3x3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`p-2 rounded ${viewMode === "list" ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Sort Dropdown */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border rounded-lg px-4 py-2 text-sm bg-white"
                                >
                                    <option value="relevance">Most Relevant</option>
                                    <option value="price_low">Price: Low to High</option>
                                    <option value="price_high">Price: High to Low</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="newest">Newest</option>
                                </select>

                                {/* Mobile Filter Toggle */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="lg:hidden"
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Gig Grid/List */}
                        <div className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                : "space-y-4"
                        }>
                            {filteredGigs.map((gig) => {
                                const influencer = getInfluencer(gig.influencerId);
                                const minPrice = Math.min(...gig.packages.map(p => p.price));
                                const minDelivery = Math.min(...gig.packages.map(p => p.deliveryDays));

                                return (
                                    <Link key={gig.id} href={`/gig/${gig.slug}`}>
                                        <Card className="card-interactive hover-lift cursor-pointer h-full">
                                            {/* Gig Image Placeholder */}
                                            <div className="relative h-48 bg-gradient-to-br from-primary/10 to-accent/10 rounded-t-lg">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <Sparkles className="w-12 h-12 text-primary mx-auto mb-2" />
                                                        <p className="text-sm text-muted-foreground">Service Preview</p>
                                                    </div>
                                                </div>
                                                <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors">
                                                    <Heart className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <CardHeader className="pb-3">
                                                {/* Seller Info */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-semibold">
                                                        {influencer?.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{influencer?.name}</p>
                                                        {influencer?.level && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {influencer.level.replace('_', ' ')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <CardTitle className="text-lg line-clamp-2 mb-2">
                                                    {gig.title}
                                                </CardTitle>

                                                {/* Rating */}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                        <span className="font-semibold">{gig.rating}</span>
                                                    </div>
                                                    <span className="text-muted-foreground">
                                                        ({gig.reviewCount})
                                                    </span>
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {gig.tags.slice(0, 3).map((tag) => (
                                                        <Badge key={tag} variant="outline" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between pt-4 border-t">
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{minDelivery} days</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Starting at</p>
                                                        <p className="text-lg font-bold text-primary">
                                                            ${minPrice.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* No Results */}
                        {filteredGigs.length === 0 && (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">No services found</h3>
                                <p className="text-muted-foreground mb-6">
                                    Try adjusting your filters or search query
                                </p>
                                <Button onClick={() => {
                                    setSearchQuery("");
                                    setSelectedCategory(null);
                                    setPriceRange([0, 10000]);
                                    setSelectedRating(null);
                                }}>
                                    Clear All Filters
                                </Button>
                            </div>
                        )}

                        {/* Pagination Placeholder */}
                        {filteredGigs.length > 0 && (
                            <div className="flex justify-center gap-2 mt-12">
                                <Button variant="outline" disabled>Previous</Button>
                                <Button variant="outline" className="bg-primary text-white">1</Button>
                                <Button variant="outline">2</Button>
                                <Button variant="outline">3</Button>
                                <Button variant="outline">Next</Button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
