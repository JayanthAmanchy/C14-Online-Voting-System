/* =========================================================
   CivicVote — shared UI behaviour

   There is no localStorage "database" any more. Users, candidates,
   ballots and results all come from PostgreSQL through api.js.
   The only thing kept in localStorage is the session token.
   ========================================================= */

/**
 * Boots a page: validates the stored token against the server, then
 * renders the shared nav and footer.
 *
 * @param {string} activePage  key used to highlight the current nav link
 * @returns {Promise<object|null>} the /api/me payload, or null if signed out
 */
async function boot(activePage) {
  let me = null;

  try {
    me = await Api.me();
  } catch (error) {
    // The server is unreachable. Render the signed-out shell rather than a
    // blank page, and let the page body surface the real problem.
    console.warn("Could not verify session:", error.message);
  }

  const user = me ? me.user : null;
  renderNav(activePage, user);
  renderFooter();
  return me;
}

/** Sends an anonymous visitor to the login page. */
function requireUser(user) {
  if (!user) {
    window.location.replace("login.html");
    return true;
  }
  return false;
}

/** Sends anyone who is not an administrator to their dashboard. */
function requireAdmin(user) {
  if (requireUser(user)) return true;
  if (user.role !== "admin") {
    window.location.replace("dashboard.html");
    return true;
  }
  return false;
}

/** Skips the login and registration pages when already signed in. */
function redirectIfSignedIn(user) {
  if (user) {
    window.location.replace(user.role === "admin" ? "admin.html" : "dashboard.html");
  }
}

function logoutUser() {
  Api.clearSession();
  window.location.href = "login.html";
}

/* ---------------- Shared nav ---------------- */

function renderNav(activePage, user) {
  const el = document.getElementById("site-nav");
  if (!el) return;

  const sealSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#E4D2AE" stroke-width="1.6"><path d="M12 2l7 3v6c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10V5l7-3z"/><path d="M9 12l2 2 4-4.2"/></svg>`;

  let linksHtml = "";
  if (!user) {
    linksHtml = `
      <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a>
      <a href="results.html" class="${activePage === 'results' ? 'active' : ''}">Results</a>
      <a href="login.html" class="btn btn-outline-light btn-sm">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  } else if (user.role === "admin") {
    linksHtml = `
      <a href="admin.html" class="${activePage === 'admin' ? 'active' : ''}">Admin Panel</a>
      <a href="results.html" class="${activePage === 'results' ? 'active' : ''}">Results</a>
      <span id="nav-user-pill">${escapeHtml(user.name)}</span>
      <button class="linklike" id="nav-logout">Logout</button>
    `;
  } else {
    linksHtml = `
      <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
      <a href="voting.html" class="${activePage === 'voting' ? 'active' : ''}">Vote</a>
      <a href="results.html" class="${activePage === 'results' ? 'active' : ''}">Results</a>
      <a href="profile.html" class="${activePage === 'profile' ? 'active' : ''}">Profile</a>
      <button class="linklike" id="nav-logout">Logout</button>
    `;
  }

  const homeLink = user
    ? (user.role === "admin" ? "admin.html" : "dashboard.html")
    : "index.html";

  el.innerHTML = `
    <header class="site-header">
      <nav class="nav">
        <a href="${homeLink}" class="brand">
          <span class="brand-mark">${sealSvg}</span>
          <span>
            <span class="brand-name">CivicVote</span>
            <span class="brand-tag">Online Voting System</span>
          </span>
        </a>
        <div class="nav-links">${linksHtml}</div>
      </nav>
    </header>
  `;

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        &copy; ${new Date().getFullYear()} CivicVote &mdash; A demonstration online voting system.
        Vote data is stored in PostgreSQL and served by a Java servlet API.
      </div>
    </footer>
  `;
}

/* ---------------- Utilities ---------------- */

/** Escapes text before it is interpolated into innerHTML. */
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

/** First letters of the first two words of a name, for avatar bubbles. */
function initials(name) {
  const parts = String(name == null ? "" : name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
}

function showMsg(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = "form-msg show " + type;
}

function clearMsg(el) {
  if (!el) return;
  el.textContent = "";
  el.className = "form-msg";
}

/** Turns an ApiError into a message suitable for showing to a voter. */
function errorMessage(error) {
  return (error && error.message) ? error.message : "Something went wrong. Please try again.";
}

/** Renders a whole-page failure state into a container. */
function renderFatal(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="card" style="text-align:center;">
      <h2>Cannot reach the voting server</h2>
      <p style="margin-bottom:4px;">${escapeHtml(message)}</p>
      <p style="margin-top:0;">Start Tomcat, load <code>schema.sql</code> once, and check
      the <code>API_BASE</code> constant in <code>api.js</code>.</p>
    </div>
  `;
}