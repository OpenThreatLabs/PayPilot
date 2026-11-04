import { NextResponse } from 'next/server';
import { searchAlternativeProducts } from '@/lib/channel3';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    const alternatives = await searchAlternativeProducts(query);
    return NextResponse.json({
      source: 'Channel3 Universal Product Graph API',
      query,
      results: alternatives,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
