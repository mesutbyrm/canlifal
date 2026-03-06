import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface YouTubeSearchResult {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Use YouTube's internal search endpoint
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch from YouTube')
    }
    
    const html = await response.text()
    
    // Extract video data from the HTML
    const videos: YouTubeSearchResult[] = []
    
    // Find the ytInitialData script
    const dataMatch = html.match(/var ytInitialData = ({.+?});\s*<\/script>/)
    
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1])
        
        // Navigate through the nested structure to find video results
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents
        
        if (contents && Array.isArray(contents)) {
          for (const section of contents) {
            const items = section?.itemSectionRenderer?.contents
            
            if (items && Array.isArray(items)) {
              for (const item of items) {
                const videoRenderer = item?.videoRenderer
                
                if (videoRenderer && videos.length < 10) {
                  const videoId = videoRenderer.videoId
                  const title = videoRenderer.title?.runs?.[0]?.text || 'Untitled'
                  const channelTitle = videoRenderer.ownerText?.runs?.[0]?.text || 'Unknown'
                  const thumbnail = `https://i.ytimg.com/vi/CMEKPq-wYfI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCiulyySIOy3l9vvKoxBFp5nR9IxA`
                  const publishedAt = videoRenderer.publishedTimeText?.simpleText || ''
                  
                  videos.push({
                    id: videoId,
                    title,
                    thumbnail,
                    channelTitle,
                    publishedAt
                  })
                }
              }
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse YouTube data:', parseError)
      }
    }
    
    // If no videos found through parsing, try a simpler regex approach
    if (videos.length === 0) {
      const videoIdPattern = /"videoId":"([a-zA-Z0-9_-]{11})"/g
      const titlePattern = /"title":\{"runs":\[\{"text":"([^"]+)"/g
      
      let match
      const videoIds: string[] = []
      
      while ((match = videoIdPattern.exec(html)) !== null && videoIds.length < 10) {
        if (!videoIds.includes(match[1])) {
          videoIds.push(match[1])
        }
      }
      
      for (const videoId of videoIds.slice(0, 10)) {
        videos.push({
          id: videoId,
          title: `Video ${videoId}`,
          thumbnail: `https://i.ytimg.com/vi/ly1A-i6a0t4/maxresdefault.jpg`,
          channelTitle: 'YouTube',
          publishedAt: ''
        })
      }
    }
    
    return NextResponse.json({ videos })
  } catch (error) {
    console.error('YouTube search error:', error)
    return NextResponse.json({ videos: [], error: 'Search failed' }, { status: 500 })
  }
}
