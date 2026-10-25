const API_BASE = '/api'; 
const HOME_SERVER = 'https://mc-api.bladeshiver.dev'; 

// 注意这里！不要用 let supabase，用 sb 避免冲突
let sb, session; 
const $ = (id) => document.getElementById(id);

async function init() {
  try {
    // 1. 获取后端配置
    const res = await fetch(`${API_BASE}/config`);
    const config = await res.json();
    
    // 2. 初始化 Supabase (使用全局的 window.supabase 里的 createClient)
    sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    
    // 3. 监听登录状态
    sb.auth.onAuthStateChange((_event, _session) => {
      session = _session;
      if (session) showMainView();
      else showLoginView();
    });

    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session) showMainView();
    else showLoginView();

    // 4. 绑定 UI 事件
    $('agree-check').addEventListener('change', (e) => {
      $('btn-login').disabled = !e.target.checked;
    });
    
    $('btn-login').addEventListener('click', () => {
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    });

    $('btn-logout').addEventListener('click', () => sb.auth.signOut());

    $('btn-save-id').addEventListener('click', async () => {
      const mcId = $('mc-id-input').value.trim();
      if (!mcId) return alert('请输入 ID');
      try {
        const r = await fetch(`${HOME_SERVER}/api/user/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ minecraftId: mcId })
        });
        if (r.ok) showMsg('ID 保存成功！');
        else alert('保存失败');
      } catch (e) { alert('家里服务器未开启，连接失败'); }
    });

    document.querySelectorAll('.btn-subscribe').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerText = '加载中...';
        try {
          const r = await fetch(`${API_BASE}/create-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ server: 'survival' })
          });
          const data = await r.json();
          if (data.url) window.location.href = data.url;
          else alert(data.error || 'Stripe 未配置');
        } catch (e) {
          alert('请求支付失败');
          btn.disabled = false;
          btn.innerText = '订阅 RM10/月';
        }
      });
    });
  } catch (err) {
    console.error("初始化失败:", err);
    alert("加载配置失败，请检查 Netlify 环境变量是否填好！");
  }
}

function showLoginView() {
  $('login-view').classList.remove('hidden');
  $('main-view').classList.add('hidden');
}

function showMainView() {
  $('login-view').classList.add('hidden');
  $('main-view').classList.remove('hidden');
  $('user-email').innerText = session.user.email;
}

function showMsg(text) {
  const el = $('msg');
  el.innerText = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

document.addEventListener('DOMContentLoaded', init);