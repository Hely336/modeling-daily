/* StarHub core: 存储 / 北京时间 / 路由 / 图标 / 弹窗 */
(function(){
window.SH = {};
window.Views = {};
var DB = 'starhub_order_v1';

function defaults(){
  return {
    profile:{name:'', vname:'Victor', weight:50, kcalTarget:1600, burnTarget:300},
    supplements:[
      {id:'vc',name:'维生素C',dose:'100mg'},
      {id:'vd',name:'维生素D',dose:'10μg'},
      {id:'fish',name:'鱼油',dose:'1000mg'},
      {id:'ca',name:'钙片',dose:'600mg'}
    ],
    suppLog:{}, meals:{}, customFoods:[],
    workouts:{}, checkins:{}, favorites:[], plans:[], badges:{},
    todos:[], events:{}, expenses:[], journal:{}, orders:[], accessories:[], ideas:[],
    study:{plans:{}, sessions:[], shelf:[]},
    chat:[], stickers:[], memory:{l2:[],l3:[],l4:[],l5:[]},
    victor:{pings:{}, followed:{}},
    focus:{sessions:[], strikes:0},
    settings:{voiceOn:true, api:{base:'',key:'',model:''}}
  };
}
function load(){
  try{
    var raw = localStorage.getItem(DB);
    if(!raw) return defaults();
    var s = JSON.parse(raw), d = defaults();
    for(var k in d){ if(s[k]===undefined) s[k]=d[k]; }
    for(var pk in d.profile){ if(s.profile[pk]===undefined) s.profile[pk]=d.profile[pk]; }
    /* 修复历史数据：meal 字段曾把早/午/晚全部写成 'dinner'，按 when 校正为 breakfast/lunch/dinner/snack */
    if(s.meals) for(var _d in s.meals){ if(!s.meals[_d]||!s.meals[_d].length) continue;
      s.meals[_d].forEach(function(x){
        if(!x) return;
        var mm = x.when==='早餐'?'breakfast':x.when==='午餐'?'lunch':x.when==='下午茶'?'snack':'dinner';
        if(x.meal!==mm) x.meal = mm;
      });
    }
    /* 修复历史订单数据：补 type（默认客订）与 share 默认值 */
    if(s.orders && s.orders.length) s.orders.forEach(function(o){
      if(!o.type) o.type = 'client';
      if(!o.share) o.share = {xhs:false, dy:false, xy:false};
      if(o.authorized===undefined) o.authorized = false;
    });
    /* 配件库：确保为数组 */
    if(!s.accessories || !s.accessories.length){ if(!Array.isArray(s.accessories)) s.accessories = []; }
    else s.accessories.forEach(function(a){ if(!a) return; if(!a.category) a.category=''; if(a.pic===undefined) a.pic=''; });
    /* 创意灵感：确保为数组 */
    if(!s.ideas || !s.ideas.length){ if(!Array.isArray(s.ideas)) s.ideas = []; }
    else s.ideas.forEach(function(d){ if(!d) return; if(!d.category) d.category=''; if(d.pic===undefined) d.pic=''; if(!d.date) d.date=''; if(d.src===undefined) d.src=''; });
    return s;
  }catch(e){ return defaults(); }
}
SH.S = load();
SH.save = function(){ localStorage.setItem(DB, JSON.stringify(SH.S)); };
/* 首次运行把预置的多个 API 账号（含 Key）写入 localStorage，省去手动填写；只 seed 一次，不覆盖用户已改的账号 */
SH.ensureApis = function(){
  var SEED_APIS = [
    {name:'千问 qwen-vl-plus', base:'https://dashscope.aliyuncs.com/compatible-mode/v1', model:'qwen-vl-plus', key:'', vision:true},
    {name:'千问 qwen3.7-plus', base:'https://dashscope.aliyuncs.com/compatible-mode/v1', model:'qwen3.7-plus', key:'', vision:false},
    {name:'OpenAI',            base:'https://api.openai.com/v1',                        model:'gpt-4o-mini',  key:'', vision:true},
    {name:'DeepSeek',          base:'https://api.deepseek.com/v1',                      model:'deepseek-chat', key:'', vision:false}
  ];
  var S = SH.S; if(!S.settings) S.settings = {};
  if(!S.settings.apis || !S.settings.apis.length){
    S.settings.apis = SEED_APIS.map(function(a){ return {name:a.name, base:a.base, model:a.model, key:a.key, vision:!!a.vision}; });
    var idx = 0;
    for(var i=0;i<S.settings.apis.length;i++){ if(/qwen-vl-plus/.test(S.settings.apis[i].model||'')){ idx=i; break; } }
    if(S.settings.apis[idx]) S.settings.api = JSON.parse(JSON.stringify(S.settings.apis[idx]));
    else if(!S.settings.api && S.settings.apis[0]) S.settings.api = JSON.parse(JSON.stringify(S.settings.apis[0]));
    try{ SH.save(); }catch(e){}
  }
};
/* 助手名字（可在设置中改，默认 Victor） */
SH.vName = function(){ return (SH.S.profile.vname||'').trim() || 'Victor'; };

/* ---- 北京时间 ---- */
SH.bjNow = function(){
  return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Shanghai'}));
};
SH.today = function(){
  return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
};
SH.dstr = function(d){
  var y=d.getFullYear(),m=('0'+(d.getMonth()+1)).slice(-2),dd=('0'+d.getDate()).slice(-2);
  return y+'-'+m+'-'+dd;
};
SH.hm = function(d){ d=d||SH.bjNow(); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); };
SH.uid = function(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); };
SH.esc = function(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
SH.weekCN = ['周日','周一','周二','周三','周四','周五','周六'];

/* ---- 模型（客订 / 自设）收费状态助手 ---- */
/* 收入：客订看 fee；自设看是否授权（authFee） */
SH.modelIncome = function(o){
  if(!o) return 0;
  if(o.type==='self') return o.authorized ? (+o.authFee||0) : 0;
  return +o.fee||0;
};
/* 已收费：做完了且产生了收入（客订 fee>0 / 自设已授权） */
SH.modelPaid = function(o){ return !!o.end && SH.modelIncome(o) > 0; };
SH.modelTypeName = function(o){ return o.type==='self' ? '自设' : '客订'; };
/* 分享平台标签 HTML（小红书/抖音/闲鱼） */
SH.modelShareHtml = function(o){
  var s = o.share||{};
  var map = [['xhs','小红书'],['dy','抖音'],['xy','闲鱼']];
  var parts = map.filter(function(m){ return s[m[0]]; }).map(function(m){ return '<span class="shp">'+m[1]+'</span>'; });
  return parts.length ? parts.join('') : '';
};

/* ---- 图标（粉色单色线条） ---- */
var P = {
  home:'<path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2z"/>',
  bowl:'<path d="M4 13h16c0 4-3.6 7-8 7s-8-3-8-7z"/><path d="M9 4c1.5 1.8-1 2.7.5 4.5M14 4c1.5 1.8-1 2.7.5 4.5"/>',
  dumbbell:'<path d="M7 8v8M17 8v8M4 10v4M20 10v4M7 12h10"/>',
  book:'<path d="M5 5a2 2 0 0 1 2-2h12v16H7a2 2 0 0 0-2 2V5z"/><path d="M7 17h12"/>',
  calendar:'<rect x="4" y="5" width="16" height="16" rx="4"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  pen:'<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M13.5 7.5l3 3"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M9 9l3 3 3-3M12 12v6M9.5 14.5h5"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 2h4M12 2v3"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>',
  cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  chat:'<path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4V6z"/>',
  gear:'<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  heart:'<path d="M12 20s-7-4.5-9-9c-1.3-3 1-7 4.5-7C10 4 12 6.5 12 6.5S14 4 16.5 4C20 4 22.3 8 21 11c-2 4.5-9 9-9 9z"/>',
  star:'<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 5.9L12 16.4 6.6 19.3l1.2-5.9L3.4 9.3l6-.7z"/>',
  fire:'<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3 2-5 3.5-7 .4 1.6 1.2 2.5 2.5 3C11.5 8 12 5 14 3c.5 3 4.5 5.5 4.5 11 0 4.4-2.5 7-6.5 7z"/>',
  moon:'<path d="M20 14A8.5 8.5 0 0 1 10 4a8 8 0 1 0 10 10z"/>',
  bell:'<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  speaker:'<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5L10 15.5z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit:'<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/>',
  camera:'<path d="M4 8a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="13" r="3.5"/>',
  send:'<path d="M4 12l16-8-5 16-3.5-5.5L4 12z"/>',
  run:'<circle cx="14" cy="5" r="2"/><path d="M9 21l2.5-5L9 13l2-4 4 2 3 1M11 9L8 8 5.5 10.5"/>',
  medal:'<circle cx="12" cy="14" r="5"/><path d="M9 10L6 3M15 10l3-7M12 12.5l.9 1.9 2.1.3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2.1-.3z"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  cup:'<path d="M8 3h8v7a4 4 0 0 1-8 0V3z"/><path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5M12 14v4M8 21h8M12 18c-1 0-2 1.5-2 3M12 18c1 0 2 1.5 2 3"/>',
  dots:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  list:'<path d="M9 6h10M9 10.5h10M9 15h10M9 19h10"/><path d="M4.5 6h.01M4.5 10.5h.01M4.5 15h.01M4.5 19h.01"/>',
  img:'<rect x="3" y="5" width="18" height="14" rx="4"/><circle cx="9" cy="10" r="1.5"/><path d="M3 17l5-4 4 3 4-4 5 5"/>',
  chip:'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3"/>',
  key:'<circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 6l2 2M14 8l2 2"/>',
  tag:'<path d="M3 12l8-8h6a2 2 0 0 1 2 2v6l-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'
};
SH.icon = function(name, cls){
  return '<svg class="ic '+(cls||'')+'" viewBox="0 0 24 24">'+(P[name]||P.sparkle)+'</svg>';
};

/* ---- 视频海报卡（真实封面预览） ----
   v: {t 标题, up UP主, pf 平台, tag 分类, min 时长, play 播放量, pic 封面, url 链接}
   actions: 卡片底部按钮 HTML（可空） */
/* 封面加载失败：先退回原图，再退回占位 */
SH.picFail = function(img){
  var raw = img.getAttribute('data-raw');
  if(raw && img.src !== raw){ img.src = raw; return; }
  img.style.display = 'none';
  var ph = img.parentNode.querySelector('.ph');
  if(ph) ph.style.display = 'flex';
};
SH.videoCard = function(v, actions){
  var thumb = v.pic ? (/hdslb\.com/.test(v.pic) ? v.pic+'@560w_315h_1c.webp' : v.pic) : '';
  var cover = v.pic
    ? '<img src="'+thumb+'" data-raw="'+v.pic+'" alt="'+SH.esc(v.t)+'" loading="lazy" '+
      'referrerpolicy="no-referrer" onerror="SH.picFail(this)">'+
      '<div class="ph" style="display:none">'+SH.icon('play')+'&nbsp;点击观看</div>'
    : '<div class="ph">'+SH.icon('play')+'&nbsp;点击观看</div>';
  var meta = [];
  if(v.up) meta.push('UP · '+SH.esc(v.up));
  return '<div class="vpost">'+
    '<a class="cover" href="'+(v.url||'#')+'" target="_blank" rel="noopener">'+cover+
      '<span class="pf">'+(v.pf||'B站')+'</span>'+
      '<span class="play">'+SH.icon('play')+'</span>'+
      (v.min?'<span class="dur">'+v.min+' 分钟</span>':'')+
      (v.play?'<span class="plays">▶ '+v.play+'</span>':'')+
    '</a>'+
    '<div class="body"><div class="vt">'+SH.esc(v.t)+'</div>'+
      '<div class="vs">'+(v.tag?'<span class="vtag">'+SH.esc(v.tag)+'</span>':'')+
      '<span>'+meta.join(' · ')+'</span></div></div>'+
    (actions?'<div class="acts">'+actions+'</div>':'')+
  '</div>';
};

/* ---- 导航 ---- */
var NAV = [
  ['home','首页','home'],['order','接单','briefcase'],['acc','配件库','box'],['idea','创意','bulb'],['auth','授权','tag'],['calendar','日历','calendar'],
  ['money','记账','coin'],['focus','专注','timer'],
  ['chat','Victor','chat'],['settings','设置','gear']
];
var PHONE = ['home','order','chat','auth','more'];
SH.cur = 'home';
/* 判断某功能页在本版本是否存在（简洁版删掉了记账/手账/日历等页面），用于意图路由 */
SH.hasView = function(id){ return !!Views[id]; };

SH.go = function(id){
  if(id==='more'){ return SH.moreSheet(); }
  SH.cur = id;
  var root = document.getElementById('content');
  root.scrollTop = 0; window.scrollTo(0,0);
  /* 聊天页锁住整页滚动，输入框始终可见 */
  document.body.classList.toggle('chat-page', id==='chat');
  if(Views[id]) Views[id].render(root);
  renderNav();
  fitChat();
};
SH.refresh = function(){ SH.go(SH.cur); };

function renderNav(){
  var sb = document.getElementById('sidebar');
  sb.innerHTML = '<div class="logo">'+SH.icon('cube')+'建模日常</div>' + NAV.map(function(n){
    var label = n[0]==='chat' ? SH.esc(SH.vName()) : n[1];
    return '<button class="tab '+(SH.cur===n[0]?'active':'')+'" onclick="SH.go(\''+n[0]+'\')">'+SH.icon(n[2])+label+'</button>';
  }).join('');
  var tb = document.getElementById('tabbar');
  tb.innerHTML = PHONE.map(function(id){
    if(id==='more'){
      var act = ['acc','idea','calendar','money','settings'].indexOf(SH.cur)>=0;
      return '<button class="tab '+(act?'active':'')+'" onclick="SH.go(\'more\')">'+SH.icon('dots')+'<span>更多</span></button>';
    }
    var n = NAV.filter(function(x){return x[0]===id;})[0];
    var center = id==='chat' ? ' center' : '';
    return '<button class="tab'+center+' '+(SH.cur===id?'active':'')+'" onclick="SH.go(\''+id+'\')">'+
      SH.icon(n[2], id==='chat'?'white':'')+(id==='chat'?'':'<span>'+n[1]+'</span>')+'</button>';
  }).join('');
}
SH.moreSheet = function(){
  var items = ['acc','idea','calendar','money','settings'];
  SH.modal('<h3>更多功能</h3><div class="grid2">'+items.map(function(id){
    var n = NAV.filter(function(x){return x[0]===id;})[0];
    return '<button class="clay-card sm" style="margin:0;text-align:center" onclick="SH.closeModal();SH.go(\''+id+'\')">'+
      SH.icon(n[2],'lg')+'<div style="font-weight:700;margin-top:6px">'+n[1]+'</div></button>';
  }).join('')+'</div>');
};

/* ---- 弹窗 / Toast ---- */
SH.modal = function(html){
  document.getElementById('modal').innerHTML = html;
  document.getElementById('overlay').classList.add('show');
};
SH.closeModal = function(){ document.getElementById('overlay').classList.remove('show'); };
var toastT = null;
SH.toast = function(msg){
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('show'); }, 2600);
};

/* ---- 语音 TTS ---- */
SH.speak = function(text){
  if(!SH.S.settings.voiceOn) return;
  try{
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text.replace(/[🌸💪🔥⭐️✨🎉❤️😤😡]/g,''));
    u.lang = 'zh-CN'; u.rate = 1.02; u.pitch = 0.9;
    var vs = speechSynthesis.getVoices().filter(function(v){return /zh|CN/i.test(v.lang);});
    if(vs.length) u.voice = vs[0];
    speechSynthesis.speak(u);
  }catch(e){}
};

/* ---- 图片压缩 ---- */
SH.compressImg = function(file, maxW, cb){
  var r = new FileReader();
  r.onload = function(){
    var img = new Image();
    img.onload = function(){
      var sc = Math.min(1, maxW/img.width);
      var c = document.createElement('canvas');
      c.width = img.width*sc; c.height = img.height*sc;
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.72));
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
};

/* ---- 启动 ---- */
/* 把聊天页锁定到「可视区域」，彻底避免 iOS/Android 聚焦输入框时整页上移、顶栏(连接状态)被推出屏幕。
   原理：用 visualViewport 的真实矩形给 #content 设 position:fixed，键盘弹起时可视区高度自动收缩，
   输入框恒定贴底、顶栏不动，不再依赖会随键盘变化的 dvh，也不靠浏览器自动滚动。 */
function fitChat(){
  var content = document.getElementById('content');
  if(!content) return;
  var vv = window.visualViewport;
  if(SH.cur!=='chat'){
    /* 离开聊天页：清除键盘态，恢复普通文档流 */
    document.body.classList.remove('kb-open');
    document.documentElement.style.setProperty('--kb','0px');
    return;
  }
  /* 聊天页不再使用 position:fixed。改为普通文档流，iOS 聚焦输入框时才能滚动整页把输入框抬到键盘上方；
     否则 standalone(添加到主屏幕)模式下固定容器无法滚动，iOS 不弹软键盘。这里仅：键盘弹起时隐藏底部导航、记录键盘高度。 */
  var h = vv ? vv.height : window.innerHeight;
  var top = vv ? vv.offsetTop : 0;
  var gap = Math.max(0, window.innerHeight - h - top);
  var open = gap > 60;
  document.documentElement.style.setProperty('--kb', open ? gap+'px' : '0px');
  document.body.classList.toggle('kb-open', open);
}

/* iOS PWA(添加到主屏幕 standalone)键盘修复（最终验证版，依据 coder/xum PR#372 + gavalierm/ios-pwa-scrolling-input-focus-fix）：
   1) touch-action 已在 CSS 对 input/textarea/select 设为 auto（绝不用 manipulation）——PR#372 的真凶已排除。
   2) viewport meta 已加 interactive-widget=resizes-content——PR#372 要求的另一半。
   3) 关键：touchstart 捕获阶段「同步」预聚焦 el.focus({preventScroll:true})。
      iOS WKWebView 只认来自同步用户手势的 focus，且必须 preventScroll:true（否则 iOS 自动滚动会冲破固定布局、键盘不弹）。
      在原生 tap 之前先聚焦，iOS 跳过其自动滚动逻辑，键盘正常弹起。
      注意：异步(setTimeout/click/touchend)里再 focus() 必被 WKWebView 拦截——所以绝不异步抢焦点。 */
function bindInputFocus(){
  function reveal(){
    var el = document.activeElement;
    if(!el) return;
    var t = el.tagName;
    if(t!=='INPUT' && t!=='TEXTAREA' && t!=='SELECT' && !el.isContentEditable) return;
    try{
      if(el.scrollIntoViewIfNeeded){ el.scrollIntoViewIfNeeded(true); }
      else { el.scrollIntoView({block:'center'}); }
    }catch(_){}
  }
  /* focusin 后只做「滚动兜底」，把输入框滚入视口；绝不在此调用 focus()（异步 focus 在 PWA 下会被拦截）。 */
  document.addEventListener('focusin', function(){ setTimeout(reveal, 120); });
  /* 同步预聚焦：touchstart 捕获阶段，目标本身就是输入框时才抢焦点，preventScroll:true 防止 iOS 自动滚动破坏布局。 */
  document.addEventListener('touchstart', function(e){
    var el = e.target;
    if(el && (el.tagName==='INPUT' || el.tagName==='TEXTAREA' || el.tagName==='SELECT' || el.isContentEditable)){
      try{ el.focus({preventScroll:true}); }catch(_){}
    }
  }, true);
  /* 点击兜底：仅滚动，不抢焦点（避免异步 focus）。 */
  document.addEventListener('click', function(e){
    var el = e.target;
    if(el && (el.tagName==='INPUT' || el.tagName==='TEXTAREA' || el.tagName==='SELECT' || el.isContentEditable)){
      setTimeout(reveal, 120);
    }
  }, true);
  var vv = window.visualViewport;
  if(vv) vv.addEventListener('resize', function(){ setTimeout(reveal, 50); });
}
function bindViewport(){
  var vv = window.visualViewport;
  if(!vv) return;
  vv.addEventListener('resize', fitChat);
  vv.addEventListener('scroll', fitChat);
  fitChat();
}

/* 版本自更新：每次启动拉取 version.json，与内置版本比对，不一致则自动重载，
   从此已安装的 PWA(添加到主屏幕)无需手动清缓存即可拿到最新代码。 */
SH.checkUpdate = function(){
  try{
    var APP_VER = '20260908g';
    fetch('version.json?t=' + Date.now(), {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j && j.v && j.v !== APP_VER){
          var tried = sessionStorage.getItem('sh_upd_tried');
          if(!tried){ sessionStorage.setItem('sh_upd_tried','1'); location.reload(true); }
        }
      })
      .catch(function(){});
  }catch(_){}
};

SH.init = function(){
  SH.ensureApis();
  renderNav();
  bindViewport();
  bindInputFocus();
  SH.go('home');
  if(window.Victor) Victor.start();
  /* 监听新版 Service Worker 推送的更新消息，自动重载 */
  try{
    if(navigator.serviceWorker){
      navigator.serviceWorker.addEventListener('message', function(ev){
        if(ev.data && ev.data.type==='UPDATE'){
          var tried = sessionStorage.getItem('sh_upd_tried');
          if(!tried){ sessionStorage.setItem('sh_upd_tried','1'); location.reload(true); }
        }
      });
    }
  }catch(_){}
  SH.checkUpdate();
  setInterval(function(){
    var el = document.getElementById('bjclock');
    if(el) el.textContent = SH.hm();
  }, 15000);
};
})();
