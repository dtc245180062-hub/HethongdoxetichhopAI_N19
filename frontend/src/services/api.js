const API_BASE = '/api';

function getAuthHeaders(isJson = true) {
  const token = localStorage.getItem('doxeai_token');
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // ==========================================
  // XÁC THỰC & NGƯỜI DÙNG (AUTH & USERS)
  // ==========================================
  async login(taiKhoan, matKhau) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taiKhoan, matKhau })
    });
    return res.json();
  },

  async register(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(true)
    });
    return res.json();
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(true)
      });
    } catch (e) {
      console.warn('Lỗi khi gọi API logout:', e);
    } finally {
      localStorage.removeItem('doxeai_token');
      localStorage.removeItem('doxeai_user');
    }
    return { success: true };
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(true)
    });
    return res.json();
  },

  async createUser(userData) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async updateUser(id, userData) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async deleteUser(id) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true)
    });
    return res.json();
  },

  // ==========================================
  // THỐNG KÊ & SƠ ĐỒ BÃI XE
  // ==========================================
  async getDashboard() {
    const res = await fetch(`${API_BASE}/dashboard`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  },

  async getOverview() {
    return this.getDashboard();
  },

  async getViTri(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/vi-tri?${query}`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  },

  async getKhuVuc() {
    const res = await fetch(`${API_BASE}/khu-vuc`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  },

  async createXe(xeData) {
    const res = await fetch(`${API_BASE}/xe`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(xeData)
    });
    return res.json();
  },

  async deleteXe(id) {
    const res = await fetch(`${API_BASE}/xe/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true)
    });
    return res.json();
  },

  async getXe(search = '') {
    const res = await fetch(`${API_BASE}/xe?search=${encodeURIComponent(search)}`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  },

  async getLuotVaoRa(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/luot-vao-ra?${query}`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  },

  async getBangGia() {
    const res = await fetch(`${API_BASE}/bang-gia`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  },

  // ==========================================
  // CỔNG XE VÀO / RA & AI OCR
  // ==========================================
  async detectPlateAI(options = {}) {
    let body;
    let headers = getAuthHeaders(false);

    if (options instanceof FormData) {
      body = options;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options);
    }

    const res = await fetch(`${API_BASE}/ai/detect-plate`, {
      method: 'POST',
      headers,
      body
    });
    return res.json();
  },

  async xeVao(data) {
    let body;
    let headers = getAuthHeaders(false);

    if (data instanceof FormData) {
      body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    const res = await fetch(`${API_BASE}/xe-vao`, {
      method: 'POST',
      headers,
      body
    });
    return res.json();
  },

  async xeRa(data) {
    let body;
    let headers = getAuthHeaders(false);

    if (data instanceof FormData) {
      body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    const res = await fetch(`${API_BASE}/xe-ra`, {
      method: 'POST',
      headers,
      body
    });
    return res.json();
  },

  async checkIn(data) {
    return this.xeVao(data);
  },

  async checkOut(data) {
    return this.xeRa(data);
  },

  // ==========================================
  // ==========================================
  // TRỢ LÝ AI QUẢN TRỊ VIÊN (ADMIN AI ASSISTANT)
  // ==========================================
  async askAdminAssistant(question) {
    try {
      const res = await fetch(`${API_BASE}/admin/assistant/ask`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ question, message: question })
      });
      return await res.json();
    } catch (err) {
      const fallbackRes = await fetch(`${API_BASE}/ai-assistant`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ message: question })
      });
      return await fallbackRes.json();
    }
  },

  async askAssistant(message) {
    return this.askAdminAssistant(message);
  },

  // ==========================================
  // CỔNG DỊCH VỤ KHÁCH HÀNG & CƯ DÂN
  // ==========================================
  async getCustomerHistory(bienSo) {
    const res = await fetch(`${API_BASE}/khach-hang/lich-su?bienSo=${encodeURIComponent(bienSo || '')}`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  },

  async bookSlot(bookingData) {
    const res = await fetch(`${API_BASE}/khach-hang/dat-cho`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(bookingData)
    });
    return res.json();
  },

  async sendSupportTicket(ticketData) {
    const res = await fetch(`${API_BASE}/khach-hang/ho-tro`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(ticketData)
    });
    return res.json();
  },

  async getSupportTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/khach-hang/ho-tro?${query}`, {
      headers: getAuthHeaders(false)
    });
    return res.json();
  }
};
