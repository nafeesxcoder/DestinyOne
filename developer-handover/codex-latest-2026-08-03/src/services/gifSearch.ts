import type { ChatGifCatalogItem } from '../domain/chatMediaCatalog';

type GiphyImage={
  url?:string;
};

type GiphyItem={
  id?:string;
  title?:string;
  images?:{
    fixed_width?:GiphyImage;
    fixed_width_small?:GiphyImage;
    downsized_medium?:GiphyImage;
    downsized?:GiphyImage;
    original?:GiphyImage;
  };
};

type GiphyResponse={
  data?:GiphyItem[];
  pagination?:{
    total_count?:number;
    count?:number;
    offset?:number;
  };
};

export type GifSearchPage={
  items:ChatGifCatalogItem[];
  totalCount:number;
  nextOffset:number|null;
  provider:'giphy';
};

const configuredKey=process.env.EXPO_PUBLIC_GIPHY_API_KEY?.trim()??'';

export const gifSearchConfigured=configuredKey.length>0;
export const gifSearchProviderName='GIPHY';

export async function searchGifProvider({
  query,
  offset=0,
  limit=36,
  apiKey=configuredKey,
  fetcher=fetch,
}:{
  query:string;
  offset?:number;
  limit?:number;
  apiKey?:string;
  fetcher?:typeof fetch;
}):Promise<GifSearchPage>{
  if(!apiKey)throw new Error('GIF search is not configured.');
  const safeLimit=Math.max(1,Math.min(50,Math.floor(limit)));
  const safeOffset=Math.max(0,Math.min(4999,Math.floor(offset)));
  const normalized=query.trim();
  const endpoint=normalized?'search':'trending';
  const params=new URLSearchParams({
    api_key:apiKey,
    limit:String(safeLimit),
    offset:String(safeOffset),
    rating:'g',
    bundle:'messaging_non_clips',
  });
  if(normalized){
    params.set('q',normalized);
    params.set('lang','en');
  }
  const response=await fetcher(`https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`);
  if(!response.ok)throw new Error(`GIF search temporarily unavailable (${response.status}).`);
  const payload=await response.json() as GiphyResponse;
  const items=(payload.data??[]).flatMap((item,index)=>{
    const uri=item.images?.fixed_width?.url
      ??item.images?.downsized_medium?.url
      ??item.images?.downsized?.url
      ??item.images?.original?.url
      ??item.images?.fixed_width_small?.url;
    if(!uri)return [];
    const rawTitle=item.title?.replace(/\s*GIF\s*$/i,'').trim();
    const title=rawTitle||normalized||'Popular reaction';
    return [{
      id:`giphy-${item.id??`${safeOffset}-${index}`}`,
      title,
      style:normalized?'Search result':'Trending',
      uri,
      provider:'giphy' as const,
      attribution:'GIPHY',
      searchText:`${title} ${normalized}`.toLowerCase(),
    }];
  });
  const totalCount=Math.max(items.length,payload.pagination?.total_count??items.length);
  const received=payload.pagination?.count??items.length;
  const nextOffset=safeOffset+received<Math.min(totalCount,5000)&&received>0?safeOffset+received:null;
  return {items,totalCount,nextOffset,provider:'giphy'};
}
