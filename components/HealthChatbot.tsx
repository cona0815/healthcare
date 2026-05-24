import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { createChatSession } from '../services/geminiService';
import { UserProfile, HealthReport, FoodAnalysis, ChatMessage } from '../types';

interface Props {
  userProfile: UserProfile;
  healthReports: HealthReport[];
  foodLogs: FoodAnalysis[];
}

const HealthChatbot: React.FC<Props> = ({ userProfile, healthReports, foodLogs }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是你的專屬健康 AI 助理。我知道你的健檢狀況和最近的飲食記錄。有什麼我可以幫你的嗎？', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Initialize chat session ref (re-created if context changes significantly, but for simplicity we create on demand or ref)
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
    setLoading(true);

    try {
      let warnings = healthReports?.[0]?.metrics?.filter(m => m.status !== 'Normal').map(m => m.name).join('、') || "無特殊異常";
      const systemInstruction = `你是 HealthGuardian AI，專業、友善的個人健康管家。使用繁體中文。使用者: ${userProfile.name}。近期異常: ${warnings}。`;

      const contents = [...messages, { role: 'user', text: userText }].filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const token = localStorage.getItem('GEMINI_USER_KEY');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
          headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/gemini/generateContentStream', {
          method: 'POST',
          headers,
          body: JSON.stringify({
              model: 'gemini-3.5-flash',
              contents,
              config: { systemInstruction }
          })
      });

      if (!res.ok) throw new Error(await res.text());

      let fullResponse = "";
      
      // Temporary placeholder for streaming
      setMessages(prev => [...prev, { role: 'model', text: '...', timestamp: Date.now() }]);
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      while(reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
              if (line.startsWith('data: ')) {
                  try {
                      const data = JSON.parse(line.slice(6));
                      if (data.text) {
                          fullResponse += data.text;
                          setMessages(prev => {
                              const newArr = [...prev];
                              newArr[newArr.length - 1] = { role: 'model', text: fullResponse, timestamp: Date.now() };
                              return newArr;
                          });
                      }
                      if (data.error) throw new Error(data.error);
                  } catch(e) {}
              }
          }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: '抱歉，我現在有點忙碌，請稍後再試。', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[600px] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white flex items-center gap-3">
        <Bot className="w-7 h-7" />
        <div>
           <h2 className="font-bold text-lg">健康問答機器人</h2>
           <p className="text-sm opacity-90 flex items-center gap-1 font-medium"><Sparkles className="w-3.5 h-3.5"/> 已連結您的健檢資料庫</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-indigo-100'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-gray-600"/> : <Bot className="w-5 h-5 text-indigo-600"/>}
             </div>
             <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                 msg.role === 'user' 
                 ? 'bg-gray-800 text-white rounded-tr-none' 
                 : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
             }`}>
                {msg.text}
             </div>
          </div>
        ))}
        {loading && messages[messages.length-1].text !== '...' && (
            <div className="flex items-center gap-2 text-gray-400 text-xs ml-10">
                <Loader2 className="w-3 h-3 animate-spin" /> 正在思考...
            </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
         <div className="flex gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="問我任何健康問題..."
              className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-3 rounded-full transition-colors shadow-md"
            >
               <Send className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  );
};

export default HealthChatbot;