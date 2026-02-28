import { NextRequest, NextResponse } from "next/server";
import { sampleInfluencers } from "@/data/sample-data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const niche = searchParams.get("niche");
  const search = searchParams.get("search");

  let filteredInfluencers = sampleInfluencers;

  if (niche) {
    filteredInfluencers = filteredInfluencers.filter(inf =>
      inf.niches.includes(niche)
    );
  }

  if (search) {
    filteredInfluencers = filteredInfluencers.filter(inf =>
      inf.name.toLowerCase().includes(search.toLowerCase()) ||
      inf.bio.toLowerCase().includes(search.toLowerCase())
    );
  }

  return NextResponse.json(filteredInfluencers);
}
