(function () {
  "use strict";

  // If already logged in, redirect to profile
  if (typeof Auth !== "undefined" && Auth.isLoggedIn()) {
    window.location.href = "/profile";
    return;
  }

  var els = {
    loginTab: document.getElementById("loginTab"),
    registerTab: document.getElementById("registerTab"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    loginUsername: document.getElementById("loginUsername"),
    loginPassword: document.getElementById("loginPassword"),
    regUsername: document.getElementById("regUsername"),
    regPassword: document.getElementById("regPassword"),
    regDisplayName: document.getElementById("regDisplayName"),
    status: document.getElementById("loginStatus"),
    welcomeText: document.getElementById("welcomeText"),
  };

  function setStatus(msg, type) {
    els.status.textContent = msg || "";
    els.status.className = "login-status" + (type ? " " + type : "");
  }

  function showLogin() {
    els.loginTab.classList.add("is-active");
    els.registerTab.classList.remove("is-active");
    els.loginForm.style.display = "";
    els.registerForm.style.display = "none";
    els.welcomeText.innerHTML = SharedI18N.pick("<h1>欢迎回来</h1><p>登录你的 EmoBridge 账户，继续情绪之旅</p>", "<h1>Welcome back</h1><p>Log in to EmoBridge to continue your emotional journey</p>");
    setStatus("");
  }

  function showRegister() {
    els.registerTab.classList.add("is-active");
    els.loginTab.classList.remove("is-active");
    els.registerForm.style.display = "";
    els.loginForm.style.display = "none";
    els.welcomeText.innerHTML = SharedI18N.pick("<h1>创建新账户</h1><p>第一个注册的用户将自动成为管理员</p>", "<h1>Create an account</h1><p>The first registered user becomes the administrator</p>");
    setStatus("");
  }

  els.loginTab.addEventListener("click", showLogin);
  els.registerTab.addEventListener("click", showRegister);

  // Login
  els.loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var username = els.loginUsername.value.trim();
    var password = els.loginPassword.value;
    if (!username || !password) {
      setStatus(SharedI18N.pick("请输入用户名和密码。", "Enter your username and password."), "error");
      return;
    }
    setStatus(SharedI18N.pick("正在登录...", "Logging in…"), "");
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.detail || SharedI18N.pick("登录失败", "Login failed"));
          return data;
        });
      })
      .then(function (data) {
        Auth.saveAuth(data);
        setStatus(SharedI18N.pick("登录成功！正在跳转...", "Logged in. Redirecting…"), "success");
        setTimeout(function () {
          window.location.href = "/";
        }, 500);
      })
      .catch(function (err) {
        setStatus(err.message, "error");
      });
  });

  // Register
  els.registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var username = els.regUsername.value.trim();
    var password = els.regPassword.value;
    var displayName = els.regDisplayName.value.trim();
    if (!username || !password) {
      setStatus(SharedI18N.pick("请输入用户名和密码。", "Enter your username and password."), "error");
      return;
    }
    setStatus(SharedI18N.pick("正在注册...", "Creating account…"), "");
    fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        password: password,
        display_name: displayName || null,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.detail || SharedI18N.pick("注册失败", "Registration failed"));
          return data;
        });
      })
      .then(function (data) {
        Auth.saveAuth(data);
        var roleMsg = data.user.role === "admin" ? SharedI18N.pick("（你已成为管理员）", " (You are the administrator)") : "";
        setStatus(SharedI18N.pick("注册成功！", "Account created!") + roleMsg + SharedI18N.pick(" 正在跳转...", " Redirecting…"), "success");
        setTimeout(function () {
          window.location.href = "/";
        }, 800);
      })
      .catch(function (err) {
        setStatus(err.message, "error");
      });
  });

  // Focus first input
  els.loginUsername.focus();
})();
