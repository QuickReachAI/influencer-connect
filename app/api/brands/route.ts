import { NextRequest, NextResponse } from "next/server";
import { sampleBrands } from "@/data/sample-data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const industry = searchParams.get("industry");
  const search = searchParams.get("search");

  let filteredBrands = sampleBrands;

  if (industry) {
    filteredBrands = filteredBrands.filter(brand =>
      brand.industry === industry
    );
  }

  if (search) {
    filteredBrands = filteredBrands.filter(brand =>
      brand.companyName.toLowerCase().includes(search.toLowerCase()) ||
      brand.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  return NextResponse.json(filteredBrands);
}
