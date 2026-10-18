import React from 'react';
import {Play,ArrowUpRight,Video} from 'lucide-react';
import './teachingVideos.css';
export default function TeachingVideos({videos}:{videos:ReadonlyArray<readonly [string,string]>}){
 return <section className="care-panel teaching-videos" aria-label="影片教學"><header><h2><Video size={19}/>影片教學</h2><p>點選影片卡片，在原平台觀看</p></header><div className="teaching-video-grid">{videos.map(([title,url])=>{const host=new URL(url).hostname;const platform=host.includes('youtube')?'YouTube':host.includes('tiktok')?'TikTok':host.includes('instagram')?'Instagram':host.includes('facebook')?'Facebook':'教學影片';return <a className="teaching-video-card" key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title}，在 ${platform} 開啟新分頁`}><span className="teaching-video-play" aria-hidden="true"><Play size={21} fill="currentColor"/></span><span className="teaching-video-copy"><small>{platform} · 教學影片</small><strong>{title}</strong><span>前往觀看</span></span><ArrowUpRight className="teaching-video-arrow" size={18} aria-hidden="true"/></a>;})}</div></section>;
}
