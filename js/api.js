
const DUITKU_API_URL =
  "https://script.google.com/macros/s/AKfycbxXrCBh3zTpdEOtW4jKFTgcADm-gJ2JACndINDAYlptFAgNfZ9JLOUXK6cmMEgE87af/exec";

window.DuitkuAPI = {
  
  async request(action, payload = {}) {
    if (typeof window.duitkuGetIdToken !== "function") {
      throw new Error("Firebase belum siap.");
    }

    const idToken = await window.duitkuGetIdToken();

    const response = await fetch(DUITKU_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action,
        idToken,
        ...payload
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Permintaan gagal.");
    }

    return result;
  },

  async listRooms() {
    const result = await this.request("listRooms");
    return result.rooms || [];
  },

  async getSummary(roomId) {
    const result = await this.request("getSummary", {
      roomId
    });

    return result.summary;
  },
  async listRequestHistory(roomId) {
  const result = await this.request("listRequestHistory", {
    roomId
  });

  return result.history || [];
},

  async listTransactions(roomId, limit = 100, offset = 0) {
    const result = await this.request("listTransactions", {
      roomId,
      limit,
      offset
    });

    return result.result || {
      transactions: [],
      total: 0,
      limit,
      offset,
      hasMore: false
    };
  },

  async createTransaction(payload) {
    const result = await this.request("createTransaction", payload);
    return result.result;
  },

  async submitTransactionRequest(payload) {
    const result = await this.request(
      "submitTransactionRequest",
      payload
    );

    return result.request;
  },

  async listTransactionRequests(roomId) {
    const result = await this.request("listTransactionRequests", {
      roomId
    });

    return result.requests || [];
  },

  async approveTransactionRequest(roomId, requestId) {
    const result = await this.request("approveTransactionRequest", {
      roomId,
      requestId
    });

    return result.result;
  },

  async rejectTransactionRequest(roomId, requestId, alasanPenolakan) {
    const result = await this.request("rejectTransactionRequest", {
      roomId,
      requestId,
      alasanPenolakan
    });

    return result.result;
  },
  
  // PENGAJUAN TERPADU
  async submitActionRequest(payload) {
    return await this.request("submitActionRequest", payload);
  },

  // DATA TABUNGAN DARI GOOGLE SHEETS
  async listSavingsPlans(roomId) {
    return await this.request("listSavingsPlans", { roomId });
  },

  async createSavingsPlan(payload) {
    return await this.request("createSavingsPlan", payload);
  },

  async updateSavingsPlan(payload) {
    return await this.request("updateSavingsPlan", payload);
  },

  async deleteSavingsPlan(roomId, planId) {
    return await this.request("deleteSavingsPlan", {
      roomId,
      planId
    });
  },

  async depositSavings(payload) {
    return await this.request("depositSavings", payload);
  },

  async withdrawSavings(payload) {
    return await this.request("withdrawSavings", payload);
  }

};
