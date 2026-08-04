import { describe, expect, it, vi } from 'vitest';
import { searchGifProvider } from './gifSearch';

describe('GIF provider search',()=>{
  it('requests an exact safe-search phrase and maps provider media',async()=>{
    const fetchMock=vi.fn(async(_input:RequestInfo|URL)=>new Response(JSON.stringify({
      data:[{id:'hug-1',title:'Warm Hug GIF',images:{fixed_width:{url:'https://media.example/hug.gif'}}}],
      pagination:{total_count:1200,count:1,offset:0},
    }),{status:200}));
    const page=await searchGifProvider({query:'good morning hug',apiKey:'test-key',fetcher:fetchMock as unknown as typeof fetch});
    const requested=String(fetchMock.mock.calls[0]?.[0]);
    expect(requested).toContain('/search?');
    expect(requested).toContain('q=good+morning+hug');
    expect(requested).toContain('rating=g');
    expect(page.items[0]).toMatchObject({id:'giphy-hug-1',title:'Warm Hug',uri:'https://media.example/hug.gif',provider:'giphy'});
    expect(page.totalCount).toBe(1200);
    expect(page.nextOffset).toBe(1);
  });

  it('uses trending for an empty search and refuses missing configuration',async()=>{
    await expect(searchGifProvider({query:'',apiKey:''})).rejects.toThrow('not configured');
    const fetchMock=vi.fn(async(_input:RequestInfo|URL)=>new Response(JSON.stringify({data:[],pagination:{total_count:0,count:0,offset:0}}),{status:200}));
    await searchGifProvider({query:'',apiKey:'test-key',fetcher:fetchMock as unknown as typeof fetch});
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/trending?');
  });
});
