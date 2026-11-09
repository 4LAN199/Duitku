
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
  }
};
