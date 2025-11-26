import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        Authorization: process.env.PEXELS_API_KEY!,
      },
    });

    const data = await res.json();

    const photoUrl = data.photos && data.photos.length > 0 ? data.photos[0].src.medium : null;

    return NextResponse.json({ photoUrl });
  } catch (error) {
    console.error('Pexels API error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}