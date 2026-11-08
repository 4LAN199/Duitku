
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

(() => {
  const $ = id => document.getElementById(id);

  const firebaseConfig = {
    apiKey: "AIzaSyCHVCxO6gwtmwK8WUHfS4Om_KecEQvGgWM",
    authDomain: "alan-agb.firebaseapp.com",
    projectId: "alan-agb",
    storageBucket: "alan-agb.firebasestorage.app",
    messagingSenderId: "298678037243",
    appId: "1:298678037243:web:fbd42f9f517189d9889e5e",
    measurementId: "G-SCWBF8P3S4"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
window.duitkuGetIdToken = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Pengguna belum login.");
  }

  return await currentUser.getIdToken();
};
  const DEVELOPER_EMAIL = "iqbalmaulanaal123@gmail.com";
  let registering = false;

  const initials = name =>
    String(name || "Duitku")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(x => x[0])
      .join("")
      .toUpperCase() || "DU";

  function message(text, error = false) {
    $("authMessage").textContent = text;
    $("authMessage").classList.toggle("error", error);
  }

  function tab(which) {
    const login = which === "login";

    $("loginForm").hidden = !login;
    $("registerForm").hidden = login;
    $("loginTab").classList.toggle("active", login);
    $("registerTab").classList.toggle("active", !login);

    $("authHeading").textContent = login
      ? "Masuk ke Duitku"
      : "Buat akun Duitku";

    $("authSubtitle").textContent = login
      ? "Kelola keuanganmu dengan lebih teratur."
      : "Daftar untuk mulai mencatat keuangan.";

    message("");
  }

  function showWelcome() {
    const modal = $("welcomeModal");
    if (!modal) return;

    if (sessionStorage.getItem("duitku-welcome-shown") === "yes") {
      return;
    }

    sessionStorage.setItem("duitku-welcome-shown", "yes");
    modal.hidden = false;
  }

  function closeWelcome() {
    const modal = $("welcomeModal");
    if (modal) modal.hidden = true;
  }

  function showApp(user) {
    $("authScreen").hidden = true;
    $("app").style.display = "flex";

    $("profileName").textContent = user.name;
    $("profileEmail").textContent = user.email;
    $("profileInitials").textContent = initials(user.name);

    const preview = document.querySelector(".preview");
    if (preview) preview.textContent = "● Terhubung ke Firebase";

    window.dispatchEvent(
      new CustomEvent("duitku:authenticated", { detail: user })
    );

    showWelcome();
  }

  function showLogin() {
    $("app").style.display = "none";
    $("authScreen").hidden = false;
    tab("login");
  }

  function friendlyError(error) {
    const messages = {
      "auth/invalid-credential": "Email atau kata sandi salah.",
      "auth/user-not-found": "Akun tidak ditemukan.",
      "auth/wrong-password": "Kata sandi salah.",
      "auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
      "auth/weak-password": "Kata sandi terlalu lemah. Gunakan minimal 8 karakter.",
      "auth/invalid-email": "Format email tidak valid.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
      "auth/network-request-failed": "Koneksi internet bermasalah.",
      "permission-denied": "Akses profil ditolak oleh aturan Firestore."
    };

    return messages[error.code] ||
      error.message ||
      "Terjadi kesalahan. Silakan coba lagi.";
  }

  async function loadUserProfile(firebaseUser) {
    const email = firebaseUser.email.toLowerCase();
    const profileRef = doc(db, "users", email);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      throw new Error(
        "Profil akun belum ditemukan di Firestore. Hubungi pengelola Duitku."
      );
    }

    const profile = profileSnap.data();

    // Email Developer ditetapkan dari konfigurasi aplikasi.
    // Role Firestore belum diubah pada tahap ini.
    const role = email === DEVELOPER_EMAIL
      ? "developer"
      : (profile.role || "viewer");

    return {
      uid: firebaseUser.uid,
      name: profile.name || firebaseUser.displayName || email,
      email,
      role,
      status: profile.status || "active"
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("loginTab").addEventListener("click", () => tab("login"));
    $("registerTab").addEventListener("click", () => tab("register"));

    document.querySelectorAll("[data-toggle-password]").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = $(btn.dataset.togglePassword);
        input.type = input.type === "password" ? "text" : "password";
        btn.textContent = input.type === "password" ? "Lihat" : "Tutup";
      });
    });

    $("registerForm").addEventListener("submit", async e => {
      e.preventDefault();

      const name = $("registerName").value.trim();
      const email = $("registerEmail").value.trim().toLowerCase();
      const password = $("registerPassword").value;
      const confirm = $("registerConfirm").value;

      if (password.length < 8) {
        message("Kata sandi minimal 8 karakter.", true);
        return;
      }

      if (password !== confirm) {
        message("Konfirmasi kata sandi tidak cocok.", true);
        return;
      }
      registering = true;

      try {
        message("Membuat akun Firebase...");

        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await updateProfile(credential.user, {
          displayName: name
        });

        const profileRef = doc(db, "users", email);
        const profileSnap = await getDoc(profileRef);

        // Jangan menimpa profil lama jika dokumen sudah tersedia.
        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            name,
            email,
            role: "viewer",
            status: "active",
            emailVerified: credential.user.emailVerified,
            createdAt: serverTimestamp()
          });
        }
        const user = await loadUserProfile(credential.user);
        registering = false;
        showApp(user);

        message("Akun berhasil dibuat.");
      } catch (error) {
        message(friendlyError(error), true);
      }
    });

    $("loginForm").addEventListener("submit", async e => {
      e.preventDefault();

      const email = $("loginEmail").value.trim().toLowerCase();
      const password = $("loginPassword").value;

      try {
        message("Memeriksa akun Firebase...");

        await signInWithEmailAndPassword(auth, email, password);
        message("Login berhasil.");
      } catch (error) {
        message(friendlyError(error), true);
      }
    });

    $("forgotPassword").addEventListener("click", () => {
      message("Fitur reset kata sandi Firebase akan kita aktifkan pada tahap berikutnya.");
    });

    $("closeWelcome").addEventListener("click", closeWelcome);
    $("startUsingDuitku").addEventListener("click", closeWelcome);

    $("welcomeModal").addEventListener("click", e => {
      if (e.target === $("welcomeModal")) closeWelcome();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !$("welcomeModal").hidden) {
        closeWelcome();
      }
    });

    function requestLogout() {
      $("logoutConfirmModal").hidden = false;
    }

    function closeLogoutConfirm() {
      $("logoutConfirmModal").hidden = true;
    }

    async function logout() {
      try {
        await signOut(auth);
        closeLogoutConfirm();
        closeWelcome();
        sessionStorage.removeItem("duitku-welcome-shown");
        $("loginPassword").value = "";
        $("registerPassword").value = "";
        $("registerConfirm").value = "";
      } catch (error) {
  registering = false;
  message(friendlyError(error), true);
}
    }

    $("logoutButton").addEventListener("click", requestLogout);
    $("logoutButtonMobile").addEventListener("click", requestLogout);

    $("cancelLogout").addEventListener("click", closeLogoutConfirm);
    $("cancelLogoutTop").addEventListener("click", closeLogoutConfirm);
    $("confirmLogout").addEventListener("click", logout);

    $("logoutConfirmModal").addEventListener("click", e => {
      if (e.target === $("logoutConfirmModal")) {
        closeLogoutConfirm();
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !$("logoutConfirmModal").hidden) {
        closeLogoutConfirm();
      }
    });

    onAuthStateChanged(auth, async firebaseUser => {
  if (registering) return;

  if (!firebaseUser) {
    showLogin();
    return;
  }

      try {
        message("Memuat profil akun...");
        const user = await loadUserProfile(firebaseUser);
        showApp(user);
      } catch (error) {
        await signOut(auth);
        showLogin();
        message(friendlyError(error), true);
      }
    });
  });
})();
