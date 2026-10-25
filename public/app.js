const API_BASE = '/api';
const HOME_SERVER = 'https://mc-api.bladeshiver.dev';
let supabase, session;

const $ = (id) => document.getElementById(id);

async function init() {
  const res = await fetch(API_BASE + '/config');
  const config = await res.json();
  supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  
  supabase.auth.onAuthStateChange((_event, _session) => {
    session = _session;
    if (session) showMainView();
    else showLoginView();
  });

  const { data } = await supabase.auth.getSession();
  session = data.session;
  if (session) showMainView();
  else showLoginView();

  $('agree-check').addEventListener('change', (e) => {
    $('btn-login').disabled = !e.target.checked;
  });
  
  $('btn-login').addEventListener('click', () => {
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  });

  $('btn-logout').addEventListener('click', () => supabase.auth.signOut());

  $('btn-save-id').addEventListener('click', async () => {
    const mcId = $('mc-id-input').value.trim();
    if (!mcId) return alert('请输入 ID');
    try {
      const r = await fetch(HOME_SERVER + '/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({ minecraftId: mcId })
      });
      if (r.ok) showMsg('ID 保存成功！');
      else alert('保存失败');
    } catch (e) { alert('网络错误'); }
  });

  document.querySelectorAll('.btn-subscribe').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerText = '加载中...';
      try {
        const r = await fetch(API_BASE + '/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
          body: JSON.stringify({ server: 'survival' })
        });
        const data = await r.json();
        if (data.url) window.location.href = data.url;
        else alert(data.error);
      } catch (e) {
        alert('请求支付失败');
        btn.disabled = false;
        btn.innerText = '订阅 RM10/月';
      }
    });
  });
}

function showLoginView() {
  $('login-view').classList.remove('hidden');
  $('main-view').classList.add('hidden');
}

function showMainView() {
  $('login-view').classList.add('hidden');
  $('main-view').classList.remove('hidden');
  $('user-email').innerText = session.user.email;
  fetchProfile();
}

async function fetchProfile() {
  try {
    const r = await fetch(HOME_SERVER + '/api/user/profile', {
      headers: { 'Authorization': 'Bearer ' + session.access_token }
    });
    if (r.ok) {
      const data = await r.json();
      if (data.minecraftId) $('mc-id-input').value = data.minecraftId;
    }
  } catch(e) {}
}

function showMsg(text) {
  const el = $('msg');
  el.innerText = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

init();