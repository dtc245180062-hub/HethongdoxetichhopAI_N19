import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Clock,
  DollarSign,
  Users,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Lightbulb,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { api } from '../services/api';

const ADMIN_PROMPTS = [
  {
    icon: Clock,
    label: 'Khung giờ nào đông xe nhất?',
    prompt: 'Khung giờ nào trong ngày đông xe nhất và cần lưu ý gì?',
    tag: 'UC-12'
  },
  {
    icon: DollarSign,
    label: 'Báo cáo doanh thu hôm nay',
    prompt: 'Hãy báo cáo tổng quan doanh thu và số lượt thanh toán hôm nay',
    tag: 'UC-13'
  },
  {
    icon: Users,
    label: 'Bố trí nhân sự ca chiều thế nào?',
    prompt: 'Nên bố trí bao nhiêu nhân sự cho ca chiều và ca tối hôm nay?',
    tag: 'UC-14'
  },
  {
    icon: TrendingUp,
    label: 'Tình hình các phân khu đỗ xe',
    prompt: 'Phân khu nào đang có tỷ lệ lấp đầy cao nhất?',
    tag: 'Sức chứa'
  }
];

export default function AiAssistantWidget({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.vaiTro === 'ADMIN' || currentUser?.vaiTro === 'QUAN_LY_DIEU_HANH';

  const CUSTOMER_PROMPTS = [
    {
      icon: Clock,
      label: 'Giá vé gửi xe là bao nhiêu?',
      prompt: 'Giá vé gửi xe máy và ô tô là bao nhiêu?'
    },
    {
      icon: DollarSign,
      label: 'Cách thanh toán?',
      prompt: 'Làm thế nào để thanh toán tiền gửi xe?'
    },
    {
      icon: TrendingUp,
      label: 'Bãi xe còn chỗ không?',
      prompt: 'Bãi xe hiện tại còn chỗ trống không?'
    },
    {
      icon: ShieldCheck,
      label: 'Giờ mở cửa bãi đỗ?',
      prompt: 'Bãi đỗ xe mở cửa vào thời gian nào?'
    }
  ];

  const SAMPLE_PROMPTS = isAdmin ? ADMIN_PROMPTS : CUSTOMER_PROMPTS;

  const initialMessage = isAdmin ? {
    id: 'welcome',
    sender: 'assistant',
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    data: {
      topic: 'Trợ Lý Điều Hành AI - DoXeAI',
      summary: 'Xin chào Quản trị viên! Tôi là Trợ lý AI hỗ trợ phân tích dữ liệu vận hành bãi đỗ xe.',
      details: [
        '📊 **Phân tích khung giờ cao điểm (UC-12)**: Dự báo lưu lượng xe theo khung giờ.',
        '💰 **Báo cáo doanh thu & hiệu suất (UC-13)**: Thống kê dòng tiền, phương thức thanh toán.',
        '👥 **Đề xuất nhân sự (UC-14)**: Phân bổ nhân viên các ca trực hợp lý.'
      ],
      recommendations: [
        'Bạn có thể bấm vào các câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp!'
      ]
    }
  } : {
    id: 'welcome',
    sender: 'assistant',
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    data: {
      topic: 'Trợ Lý Khách Hàng - DoXeAI',
      summary: 'Xin chào! Tôi là Trợ lý AI của DoXeAI. Tôi có thể giúp gì cho bạn?',
      details: [
        '🚗 Hỗ trợ kiểm tra sức chứa, giá vé gửi xe.',
        '💳 Hướng dẫn quy trình thanh toán vé xe trực tuyến.'
      ],
      recommendations: [
        'Vui lòng chọn một câu hỏi gợi ý bên dưới hoặc gửi tin nhắn cho tôi!'
      ]
    }
  };

  const [messages, setMessages] = useState([initialMessage]);

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
      const res = await api.askAssistant(query);
      if (res.success) {
        const botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          data: res.data
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: 'assistant',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            text: res.message || 'Không thể xử lý yêu cầu lúc này.'
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
          text: 'Lỗi kết nối tới máy chủ AI Assistant. Vui lòng thử lại!'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-4 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold shadow-xl shadow-cyan-900/20 border border-slate-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
            </span>
          </div>
          <span className="text-xs tracking-wide">{isAdmin ? 'Trợ Lý AI Admin' : 'Trợ Lý Khách Hàng'}</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-cyan-300 font-mono uppercase font-black border border-slate-700">
            {isAdmin ? 'UC-12/13/14' : 'AI Hỗ Trợ'}
          </span>
        </button>
      )}

      {/* 2. Chatbot Dialog Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[460px] h-[620px] max-h-[85vh] rounded-3xl bg-slate-950/95 border border-slate-800 shadow-2xl shadow-cyan-900/20 backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 ring-1 ring-white/5">
          {/* Header */}
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center shadow-lg ring-1 ring-slate-700">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-100">DoXeAI Assistant</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 font-mono border border-cyan-800/50">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{isAdmin ? 'Hỗ trợ Quản trị viên (UC-12, UC-13, UC-14)' : 'Hỗ trợ Khách hàng & Cư dân'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([initialMessage])}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Đóng cửa sổ"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Sample Prompts Bar */}
          <div className="p-2.5 bg-slate-900/50 border-b border-slate-800/80 overflow-x-auto flex items-center gap-2 no-scrollbar shrink-0">
            {SAMPLE_PROMPTS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.prompt)}
                  disabled={loading}
                  className="whitespace-nowrap px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 text-[11px] font-medium border border-slate-700/60 hover:border-cyan-700/50 flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Icon className="w-3 h-3 text-cyan-500" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0 border border-slate-700 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.sender === 'user' ? (
                    <div className="p-3.5 rounded-2xl rounded-tr-sm bg-cyan-600 text-white text-xs font-medium shadow-md shadow-cyan-900/20">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2.5 shadow-md">
                      {msg.data ? (
                        <>
                          {/* Topic Tag */}
                          {msg.data.topic && (
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/60">
                              <span className="font-extrabold text-[11px] text-cyan-400 uppercase tracking-wider">
                                {msg.data.topic}
                              </span>
                            </div>
                          )}

                          {/* Summary text */}
                          <div className="font-bold text-slate-100 leading-relaxed">
                            {msg.data.summary}
                          </div>

                          {/* Details List */}
                          {msg.data.details && msg.data.details.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {msg.data.details.map((d, i) => (
                                <div
                                  key={i}
                                  className="text-slate-400 text-[11px] leading-relaxed"
                                  dangerouslySetInnerHTML={{
                                    __html: d.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200 font-bold">$1</strong>')
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Recommendations Box */}
                          {msg.data.recommendations && msg.data.recommendations.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-900/50 space-y-1 mt-2">
                              <div className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-amber-500" /> Đề xuất điều hành:
                              </div>
                              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                                {msg.data.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Stats Pills */}
                          {msg.data.stats && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {Object.entries(msg.data.stats).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-mono"
                                >
                                  {k}: <strong className="text-cyan-100">{v}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p>{msg.text}</p>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 px-1 font-mono block">
                    {msg.time}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0 border border-slate-700 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* AI Thinking Animation */}
            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0 border border-slate-700">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span>AI đang phân tích dữ liệu bãi xe...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isAdmin ? "Nhập câu hỏi quản trị (Doanh thu, ca trực, giờ cao điểm)..." : "Nhập câu hỏi của bạn (Giá vé, thanh toán, chỗ trống)..."}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40 disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
