"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search, SlidersHorizontal, Star, Clock, CheckCircle2,
    Heart, ArrowUpDown, Grid3x3, List, Sparkles, Zap
} from "lucide-react";
import { sampleGigs, enhancedInfluencers, categories } from "@/data/enhanced-sample-data";
import { Gig } from "@/data/enhanced-types";
import { toast } from "sonner";
import { AnimatedSection } from "@/components/ui/animated-section";

const ITEMS_PER_PAGE = 9;

function BrowsePageContent() {
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<string>("relevance");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showFilters, setShowFilters] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const q = searchParams.get("q");
        if (q) setSearchQuery(q);
    }, [searchParams]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, selectedCategory, selectedRating, priceRange]);

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

    const totalPages = Math.max(1, Math.ceil(filteredGigs.length / ITEMS_PER_PAGE));
    const paginatedGigs = filteredGigs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const getPageNumbers = (): (number | "...")[] => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages: (number | "...")[] = [1];
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push("...");
        if (totalPages > 1) pages.push(totalPages);
        return pages;
    };

    const getInfluencer = (influencerId: string) => {
        return enhancedInfluencers.find(inf => inf.id === influencerId);
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center shadow-sm icon-hover-bounce">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-1.5 py-0.5 rounded-full">AI</span>
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
                                className="pl-12 pr-4 input-glow"
                            />
                        </div>
                    </div>

                    <nav className="flex items-center gap-3">
                        <Link href="/auth/login">
                            <Button variant="ghost" className="hidden sm:inline-flex animated-underline">Sign In</Button>
                        </Link>
                        <Link href="/auth/signup">
                            <Button className="bg-[hsl(var(--coral))] text-white border-0 hover:opacity-90 btn-animate">Join</Button>
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
                            className="pl-12 input-glow"
                        />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="flex gap-8">
                    {/* Filters Sidebar */}
                    <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
                        <AnimatedSection animation="animate-slide-right">
                        <div className="bg-white rounded-lg border border-border p-6 sticky top-24 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-semibold font-heading text-lg">Filters</h3>
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
                                <h4 className="font-medium mb-3 text-foreground">Category</h4>
                                <div className="space-y-2">
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setSelectedCategory(
                                                selectedCategory === category.id ? null : category.id
                                            )}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === category.id
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-foreground hover:bg-muted'
                                                }`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h4 className="font-medium mb-3 text-foreground">Budget</h4>
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
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-foreground hover:bg-muted'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rating Filter */}
                            <div className="mb-6">
                                <h4 className="font-medium mb-3 text-foreground">Seller Rating</h4>
                                <div className="space-y-2">
                                    {[5, 4.5, 4, 3.5].map((rating) => (
                                        <button
                                            key={rating}
                                            onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedRating === rating
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-foreground hover:bg-muted'
                                                }`}
                                        >
                                            <Star className="w-4 h-4 fill-current" />
                                            {rating}+ Stars
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        </AnimatedSection>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {/* Results Header */}
                        <AnimatedSection animation="animate-fade-in">
                        <div className="flex items-center justify-between mb-6 bg-white rounded-xl p-6 shadow-sm">
                            <div>
                                <h1 className="text-2xl font-bold font-heading mb-1 text-[hsl(var(--navy))]">
                                    {selectedCategory
                                        ? categories.find(c => c.id === selectedCategory)?.name
                                        : 'All Services'}
                                </h1>
                                <p className="text-[hsl(var(--navy))] opacity-70">
                                    {filteredGigs.length} services available
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* View Mode Toggle */}
                                <div className="hidden sm:flex border border-border rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`p-2 rounded ${viewMode === "grid" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                    >
                                        <Grid3x3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`p-2 rounded ${viewMode === "list" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Sort Dropdown */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-border rounded-lg px-4 py-2 text-sm bg-card text-foreground"
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
                        </AnimatedSection>

                        {/* Gig Grid/List */}
                        <div className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                : "space-y-4"
                        }>
                            {paginatedGigs.map((gig, index) => {
                                const influencer = getInfluencer(gig.influencerId);
                                const minPrice = Math.min(...gig.packages.map(p => p.price));
                                const minDelivery = Math.min(...gig.packages.map(p => p.deliveryDays));

                                return (
                                    <AnimatedSection key={gig.id} animation="animate-slide-up" delay={index * 80}>
                                    <Link href={`/gig/${gig.slug}`}>
                                        <Card className={`card-interactive hover-tilt group cursor-pointer h-full bg-white ${['border-l-primary', 'border-l-coral', 'border-l-teal', 'border-l-emerald'][index % 4]}`}>
                                            {/* Gig Image Placeholder */}
                                            <div className="relative h-48 bg-[hsl(var(--bg-blue))] rounded-t-lg">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <Sparkles className="w-12 h-12 text-[hsl(var(--primary))] mx-auto mb-2" />
                                                        <p className="text-sm text-muted-foreground">Service Preview</p>
                                                    </div>
                                                </div>
                                                <button
                                                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-muted/50 transition-colors icon-hover-bounce"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast.info("Saved!"); }}
                                                >
                                                    <Heart className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <CardHeader className="pb-3">
                                                {/* Seller Info */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white text-sm font-semibold group-hover-scale">
                                                        {influencer?.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{influencer?.name}</p>
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
                                                        <Star className="w-4 h-4 fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" />
                                                        <span className="font-semibold text-foreground">{gig.rating}</span>
                                                    </div>
                                                    <span className="text-muted-foreground">
                                                        ({gig.reviewCount})
                                                    </span>
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {gig.tags.slice(0, 3).map((tag, tagIdx) => {
                                                        const tagStyles = [
                                                            'bg-[hsl(var(--bg-blue))] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]',
                                                            'bg-[hsl(var(--bg-coral))] text-[hsl(var(--coral))] border-[hsl(var(--coral)/0.3)]',
                                                            'bg-[hsl(var(--bg-teal))] text-[hsl(var(--teal))] border-[hsl(var(--teal)/0.3)]',
                                                        ];
                                                        return (
                                                            <Badge key={tag} variant="outline" className={`text-xs hover-pop ${tagStyles[tagIdx % tagStyles.length]}`}>
                                                                {tag}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between pt-4 border-t border-border">
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{minDelivery} days</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Starting at</p>
                                                        <p className="text-lg font-bold text-[hsl(var(--coral))]">
                                                            ${minPrice.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                    </AnimatedSection>
                                );
                            })}
                        </div>

                        {/* No Results */}
                        {filteredGigs.length === 0 && (
                            <AnimatedSection animation="animate-fade-in">
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-semibold font-heading mb-2 text-foreground">No services found</h3>
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
                            </AnimatedSection>
                        )}

                        {/* Pagination */}
                        {filteredGigs.length > 0 && totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-12">
                                <Button
                                    variant="outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </Button>

                                {getPageNumbers().map((pageNum, idx) =>
                                    pageNum === "..." ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                                    ) : (
                                        <Button
                                            key={pageNum}
                                            variant="outline"
                                            className={page === pageNum ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                                            onClick={() => setPage(pageNum as number)}
                                        >
                                            {pageNum}
                                        </Button>
                                    )
                                )}

                                <Button
                                    variant="outline"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function BrowsePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--bg-blue))] flex items-center justify-center"><div className="skeleton h-8 w-32 rounded" /></div>}>
            <BrowsePageContent />
        </Suspense>
    );
}
