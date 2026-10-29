import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Clock,
  DollarSign,
  Users,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { api } from '../services/api';

const SAMPLE_PROMPTS = [
  {
    icon: Clock,
    label: 'Khung giờ nào đông xe nhất?',
    prompt: 'Khung giờ nào đông xe nhất?'
  },
  {
    icon: DollarSign,
    label: 'Báo cáo doanh thu hôm nay',
    prompt: 'Báo cáo doanh thu hôm nay'
  },
  {
    icon: Users,
    label: 'Bố trí nhân sự thế nào?',
    prompt: 'Bố trí nhân sự thế nào?'
  }
];

export default function AiAssistantWidget({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      data: {
        topic: 'Trợ lý AI hỗ trợ quản trị',
        summary: 'Xin chào Quản trị viên! Tôi là Trợ lý AI hỗ trợ tra cứu nhanh số liệu doanh thu, phân tích khung giờ cao điểm và đề xuất bố trí ca trực.',
        details: [
          '🕒 **Phân tích khung giờ cao điểm**: Xác định thời điểm bãi xe đạt mật độ đông nhất và dự báo lưu lượng xe.',
          '💰 **Báo cáo doanh thu & dòng tiền**: Thống kê số tiền thực nhận hôm nay và phân bổ theo phương thức thanh toán.',
          '👥 **Đề xuất bố trí nhân sự**: Gợi ý phân bổ số lượng nhân sự các ca trực hợp lý theo lưu lượng xe dự kiến.'
        ],
        recommendations: [
          'Bạn có thể bấm vào các câu hỏi gợi ý nhanh bên trên hoặc nhập nội dung câu hỏi tự do vào ô chat bên dưới.'
        ]
      }
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await api.askAdminAssistant(query);
      if (res.success) {
        const botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          data: res.data || {
            topic: res.topic || 'Trợ lý AI hỗ trợ quản trị',
            summary: res.answer || res.summary,
            details: [res.answer]
          }
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: 'assistant',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            text: res.message || 'Hệ thống chưa hỗ trợ hoặc câu hỏi nằm ngoài phạm vi nghiệp vụ.'
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          text: 'Lỗi kết nối tới Trợ lý AI: ' + (err.message || 'Vui lòng kiểm tra lại kết nối!')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. Nút nổi mở Chat (Nền trắng chữ đen sang trọng) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-4 py-3 rounded-full bg-white hover:bg-slate-50 text-gray-900 font-semibold shadow-xl shadow-gray-400/25 border border-gray-200 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <Bot className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold text-gray-900 tracking-tight">Trợ lý AI hỗ trợ quản trị</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            Online
          </span>
        </button>
      )}

      {/* 2. Cửa sổ Chat Trợ lý AI (Giao diện Màu trắng chữ đen) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[480px] h-[640px] max-h-[85vh] rounded-2xl bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-gray-900">Trợ lý AI hỗ trợ quản trị</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Tra cứu doanh thu • Giờ cao điểm • Bố trí ca trực
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Đóng cửa sổ"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dải câu hỏi gợi ý nhanh */}
          <div className="p-2.5 bg-gray-50/80 border-b border-gray-200 overflow-x-auto flex items-center gap-2 no-scrollbar shrink-0">
            {SAMPLE_PROMPTS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.prompt)}
                  disabled={loading}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-gray-800 hover:text-blue-700 text-[11px] font-medium border border-gray-200 hover:border-blue-200 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Icon className="w-3.5 h-3.5 text-blue-600" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Khung nội dung tin nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.sender === 'user' ? (
                    <div className="p-3 rounded-2xl rounded-tr-xs bg-gray-900 text-white text-xs font-medium shadow-sm">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-gray-200 text-xs text-gray-800 space-y-2.5 shadow-sm">
                      {msg.data ? (
                        <>
                          {msg.data.topic && (
                            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                              <span className="font-bold text-[11px] text-blue-700 uppercase tracking-wide">
                                {msg.data.topic}
                              </span>
                            </div>
                          )}

                          <div className="font-bold text-gray-900 text-[13px] leading-relaxed">
                            {msg.data.summary}
                          </div>

                          {msg.data.details && msg.data.details.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {msg.data.details.map((d, i) => (
                                <div
                                  key={i}
                                  className="text-gray-700 text-[11px] leading-relaxed"
                                  dangerouslySetInnerHTML={{
                                    __html: d.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>')
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {msg.data.recommendations && msg.data.recommendations.length > 0 && (
                            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1 mt-2 text-gray-800">
                              <div className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Đề xuất điều phối:
                              </div>
                              <ul className="list-disc list-inside text-[11px] text-gray-700 space-y-0.5">
                                {msg.data.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.data.stats && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {Object.entries(msg.data.stats).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-2.5 py-0.5 rounded-md bg-gray-50 text-gray-800 border border-gray-200 text-[10px] font-medium"
                                >
                                  {k}: <strong className="text-gray-900 font-bold">{v}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-800 leading-relaxed">{msg.text}</p>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 px-1 font-mono block">
                    {msg.time}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0 border border-gray-200 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3 rounded-2xl bg-white border border-gray-200 text-xs text-gray-500 flex items-center gap-2 shadow-xs">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span>Trợ lý AI đang tổng hợp số liệu...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập câu hỏi */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập câu hỏi về doanh thu, khung giờ cao điểm, ca trực..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-gray-900 placeholder-gray-400 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
