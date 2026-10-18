export const DEFAULT_GEMINI_MODEL='gemini-3.8-flash';
export function validModel(value:string){return /^gemini-[a-z0-9][a-z0-9.-]{1,100}$/.test(value);}
export function getGeminiModel(kind:'general'|'video'='general'){const value=localStorage.getItem('hg_gemini_model_'+kind)||DEFAULT_GEMINI_MODEL;return validModel(value)?value:DEFAULT_GEMINI_MODEL;}
export function saveGeminiModels(general:string,video:string){if(!validModel(general)||!validModel(video))throw new Error('請填寫有效的 Gemini 模型 ID，例如 gemini-3.8-flash');localStorage.setItem('hg_gemini_model_general',general);localStorage.setItem('hg_gemini_model_video',video);}
