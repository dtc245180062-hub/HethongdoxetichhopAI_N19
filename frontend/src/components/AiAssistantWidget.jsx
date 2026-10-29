import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function AiAssistantWidget({ currentUser }) {
  // RÀNG BUỘC PHÂN QUYỀN: Nhân viên bảo vệ (BAO_VE / Operator) KHÔNG ĐƯỢC PHÉP truy cập
  if (currentUser?.vaiTro === 'BAO_VE') {
    return null;
  }

  const isKhachHang = currentUser?.vaiTro === 'KHACH_HANG';

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      data: {
        topic: isKhachHang ? 'Trợ lý AI Dịch vụ Khách hàng' : 'Trợ lý AI hỗ trợ quản trị',
        summary: isKhachHang
          ? 'Xin chào quý khách! Tôi là Trợ lý AI hỗ trợ tra cứu chỗ trống bãi xe theo thời gian thực, bảng giá dịch vụ và hướng dẫn thủ tục gửi xe.'
          : 'Xin chào Quản trị viên! Tôi là Trợ lý AI hỗ trợ tra cứu nhanh số liệu doanh thu, phân tích khung giờ cao điểm và đề xuất bố trí ca trực.',
        details: isKhachHang
          ? [
              '🚗 **Tình trạng chỗ trống**: Cập nhật tức thời số lượng vị trí trống tại Khu A, Khu B, Khu C và Khu D.',
              '💵 **Bảng giá minh bạch**: Tra cứu biểu phí gửi xe theo giờ, qua đêm và vé tháng dành cho ô tô, xe máy.',
              '📋 **Hướng dẫn dịch vụ**: Hỗ trợ thủ tục đặt chỗ trước, đăng ký vé tháng và quy trình ra vào cổng tự động.'
            ]
          : [
              '🕒 **Phân tích khung giờ cao điểm**: Xác định thời điểm bãi xe đạt mật độ đông nhất và dự báo lưu lượng xe 24h tới.',
              '💰 **Báo cáo doanh thu & dòng tiền**: Thống kê số tiền thực nhận hôm nay và phân bổ theo phương thức thanh toán.',
              '👥 **Đề xuất bố trí nhân sự**: Gợi ý phân bổ số lượng nhân sự các ca trực hợp lý theo lưu lượng xe dự kiến.'
            ],
        recommendations: [
          'Bạn có thể nhập nội dung câu hỏi vào ô chat bên dưới để được hỗ trợ tức thì.'
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
            topic: res.topic || (isKhachHang ? 'Trợ lý AI Dịch vụ Khách hàng' : 'Trợ lý AI hỗ trợ quản trị'),
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
      {/* 1. NÚT BONG BÓNG CHAT MÀU XANH TRÒN GỌN GÀNG (KHÔNG HIỆN TOOLTIP KHI RÊ CHUỘT) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Mở Trợ lý AI"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 border-2 border-white transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <Bot className="w-7 h-7 drop-shadow-xs" />

          {/* Chấm trạng thái Online xanh lá cây */}
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>
        </button>
      )}

      {/* 2. CỬA SỔ CHAT TRỢ LÝ AI (NỀN TRẮNG CHỮ ĐEN, BỎ SUBTITLE VÀ BỎ THANH GỢI Ý) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[480px] h-[640px] max-h-[85vh] rounded-2xl bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header gọn gàng */}
          <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-900">
                  {isKhachHang ? 'Trợ lý AI Dịch vụ Khách hàng' : 'Trợ lý AI hỗ trợ quản trị'}
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
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

          {/* Khung nội dung tin nhắn rộng rãi (đã bỏ dải câu hỏi gợi ý) */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] space-y-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
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
                            <div className="mt-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 text-[11px] space-y-1">
                              <div className="font-semibold text-blue-800 flex items-center gap-1">
                                <span>💡 Khuyến nghị tối ưu:</span>
                              </div>
                              {msg.data.recommendations.map((rec, rIdx) => (
                                <div key={rIdx} className="leading-relaxed">
                                  • {rec}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-800 leading-relaxed">{msg.text}</div>
                      )}
                    </div>
                  )}

                  <div className={`text-[10px] text-gray-400 px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.time}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
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
              placeholder={
                isKhachHang
                  ? 'Hỏi về chỗ trống, bảng giá, thủ tục đặt chỗ...'
                  : 'Nhập câu hỏi về doanh thu, khung giờ cao điểm, ca trực...'
              }
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
