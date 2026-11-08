(() => {
  const $ = id => document.getElementById(id);
  const USERS_KEY = "duitku-v2-preview-users";
  const SESSION_KEY = "duitku-v2-preview-session";
  const readUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; } };
  const writeUsers = users => localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const digest = async value => {
    if (!crypto?.subtle) throw new Error("Browser tidak mendukung penyimpanan sandi demo. Buka melalui Chrome atau Live Server.");
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2,"0")).join("");
  };
  const initials = name => name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "DU";
  function message(text, error=false){ $("authMessage").textContent=text; $("authMessage").classList.toggle("error",error); }
  function tab(which){
    const login=which==="login";
    $("loginForm").hidden=!login; $("registerForm").hidden=login;
    $("loginTab").classList.toggle("active",login); $("registerTab").classList.toggle("active",!login);
    $("authHeading").textContent=login?"Masuk ke Duitku":"Buat akun Duitku";
    $("authSubtitle").textContent=login?"Kelola keuanganmu dengan lebih teratur.":"Daftar untuk mulai mencatat keuangan.";
    message("");
  }
 function showWelcome() {
  const modal = $("welcomeModal");
  if (!modal) return;

  // Jangan tampilkan lagi selama sesi login yang sama.
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

  document.querySelector(".preview").textContent = "● Pratinjau desain";

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email }));
  } catch {}

  window.dispatchEvent(
    new CustomEvent("duitku:authenticated", { detail: user })
  );

  showWelcome();
}
  function showLogin(){
    $("app").style.display="none"; $("authScreen").hidden=false; tab("login");
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }
  document.addEventListener("DOMContentLoaded",()=>{
    $("loginTab").addEventListener("click",()=>tab("login"));
    $("registerTab").addEventListener("click",()=>tab("register"));
    document.querySelectorAll("[data-toggle-password]").forEach(btn=>btn.addEventListener("click",()=>{
      const input=$(btn.dataset.togglePassword); input.type=input.type==="password"?"text":"password"; btn.textContent=input.type==="password"?"Lihat":"Tutup";
    }));
    $("registerForm").addEventListener("submit",async e=>{
      e.preventDefault(); message("Memproses pendaftaran...");
      const name=$("registerName").value.trim(), email=$("registerEmail").value.trim().toLowerCase();
      const password=$("registerPassword").value, confirm=$("registerConfirm").value;
      if(password.length<8){message("Kata sandi minimal 8 karakter.",true);return;}
      if(password!==confirm){message("Konfirmasi kata sandi tidak cocok.",true);return;}
      try{
        const users=readUsers();
        if(users.some(u=>u.email===email)){message("Email sudah terdaftar di pratinjau ini. Silakan masuk.",true);return;}
        const user={name,email,passwordHash:await digest(password),createdAt:new Date().toISOString()};
        users.push(user); writeUsers(users); showApp(user);
      }catch(err){message(err.message||"Pendaftaran gagal.",true);}
    });
    $("loginForm").addEventListener("submit",async e=>{
      e.preventDefault(); message("Memeriksa akun...");
      const email=$("loginEmail").value.trim().toLowerCase(), password=$("loginPassword").value;
      try{
        const hash=await digest(password), user=readUsers().find(u=>u.email===email&&u.passwordHash===hash);
        if(!user){message("Email atau kata sandi salah, atau akun belum dibuat di browser ini.",true);return;}
        showApp(user);
      }catch(err){message(err.message||"Gagal masuk.",true);}
    });
    $("forgotPassword").addEventListener("click",()=>message("Fitur reset kata sandi akan tersedia setelah Firebase Auth dihubungkan."));
    // Tombol dan interaksi pop-up Welcome
$("closeWelcome").addEventListener("click", closeWelcome);
$("startUsingDuitku").addEventListener("click", closeWelcome);

$("welcomeModal").addEventListener("click", e => {
  if (e.target === $("welcomeModal")) {
    closeWelcome();
  }
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

function logout() {
  closeLogoutConfirm();
  closeWelcome();

  // Izinkan Welcome muncul lagi setelah login berikutnya.
  sessionStorage.removeItem("duitku-welcome-shown");

  showLogin();

  $("loginPassword").value = "";
  $("registerPassword").value = "";
  $("registerConfirm").value = "";
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
    let session=null; try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{}
    const user=session?.email?readUsers().find(u=>u.email===session.email):null;
    if(user) showApp(user); else showLogin();
  });
})();
