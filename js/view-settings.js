/* 设置：个人资料 / 语音 / AI大脑 / 记忆查看 / 数据导出 */
(function(){
/* 预置 API 账号（含 Key）由 core.js 的 SH.ensureApis 写入 localStorage，这里不再重复定义 */
Views.settings = { render: function(root){
  var S = SH.S, VN = SH.vName();
  var apis = S.settings.apis || [];
  var editIdx = 0;
  for(var ai=0; ai<apis.length; ai++){ if(S.settings.api && apis[ai].base===S.settings.api.base && apis[ai].model===S.settings.api.model && apis[ai].key===S.settings.api.key){ editIdx=ai; break; } }
  Views.settings._editIdx = editIdx;
  var cur = S.settings.api || apis[editIdx] || {base:'',model:'',key:''};
  root.innerHTML =
  '<div class="vhead">'+SH.icon('gear')+'<h2>设置</h2></div>'+
  '<div class="clay-card"><div class="sect" style="margin-top:0">👤 个人资料</div>'+
  '<div class="mrow"><label>'+SH.esc(VN)+' 怎么称呼你</label><input class="clay-input" id="st_name" value="'+SH.esc(S.profile.name)+'" placeholder="你的昵称"></div>'+
  '<div class="mrow"><label>你的经理叫什么（默认 Victor）</label><input class="clay-input" id="st_vn" value="'+SH.esc(S.profile.vname||'Victor')+'" placeholder="Victor"></div>'+
  '<div class="grid2">'+
  '<div class="mrow"><label>体重 kg（算消耗用）</label><input class="clay-input" id="st_w" type="number" value="'+S.profile.weight+'"></div>'+
  '<div class="mrow"><label>每日热量目标 kcal</label><input class="clay-input" id="st_k" type="number" value="'+S.profile.kcalTarget+'"></div></div>'+
  '<div class="mrow"><label>每日消耗目标 kcal</label><input class="clay-input" id="st_b" type="number" value="'+S.profile.burnTarget+'"></div>'+
  '<button class="clay-btn" style="width:100%" onclick="Views.settings.saveProfile()">保存</button></div>'+

  '<div class="clay-card"><div class="sect" style="margin-top:0">'+SH.icon('speaker')+'语音</div>'+
  '<div class="row"><div class="grow">'+SH.esc(VN)+' 语音消息（TTS 朗读）</div>'+
  '<button class="clay-chip '+(S.settings.voiceOn?'on':'')+'" onclick="Views.settings.toggleVoice()">'+(S.settings.voiceOn?'已开启':'已关闭')+'</button></div></div>'+

  '<div class="clay-card"><div class="sect" style="margin-top:0">'+SH.icon('chip')+SH.esc(VN)+' 的 AI 大脑（可切换）</div>'+
  '<p class="hint" style="margin-bottom:10px">已为你预填 4 个 API，点下面卡片即可切换；📷=能看图、🚫=仅文字，当前使用的高亮。想换服务商直接切，'+SH.esc(VN)+' 每次对话都带北京时间＋五层记忆＋今日接单/排单/结单。支持看图的账号能识别你发的图片。</p>'+
  '<div id="apiList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">'+
  (S.settings.apis||[]).map(function(a,i){
    var active = (S.settings.api && a.base===S.settings.api.base && a.model===S.settings.api.model && a.key===S.settings.api.key);
    return '<button class="apiacct" onclick="Views.settings.switchApi('+i+')" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:10px 12px;border:none;border-radius:14px;cursor:pointer;background:'+(active?'var(--p100)':'var(--card2)')+';box-shadow:'+(active?'inset 0 0 0 2px var(--p500)':'var(--neu-out)')+';font:inherit">'+
      '<span style="flex:1;min-width:0"><span style="display:block;font-weight:600;font-size:14px;color:var(--p900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+SH.esc(a.name)+'</span>'+
      '<span style="display:block;font-size:11px;color:var(--p500)">'+SH.esc(a.model)+'</span></span>'+
      '<span style="font-size:12px;padding:2px 8px;border-radius:999px;background:'+(a.vision?'#e6f7ee':'#f2f2f5')+';color:'+(a.vision?'#1a9d5a':'#888')+'">'+(a.vision?'📷 识图':'🚫 文字')+'</span>'+
      (active?'<span style="font-size:11px;color:var(--p500);font-weight:600">使用中</span>':'')+
    '</button>';
  }).join('')+'</div>'+
  '<div class="mrow"><label>'+SH.icon('key')+'当前账号 API Key</label><input class="clay-input" id="ai_k" type="password" value="'+SH.esc(cur.key||'')+'" placeholder="粘贴 API Key，如 sk-…"></div>'+
  '<details style="margin:2px 0 12px"><summary style="font-size:12px;color:var(--p500);cursor:pointer;user-select:none">高级：接口地址 / 模型 / 识图开关（已按账号填好）</summary>'+
  '<div class="mrow" style="margin-top:10px"><label>API Base URL</label><input class="clay-input" id="ai_b" value="'+SH.esc(cur.base||'')+'"></div>'+
  '<div class="mrow"><label>模型</label><input class="clay-input" id="ai_m" value="'+SH.esc(cur.model||'')+'"></div>'+
  '<div class="row" style="margin:8px 0 2px"><div class="grow">该模型支持识图（看图）</div><input type="checkbox" id="ai_vision" '+(cur.vision?'checked':'')+'></div>'+
  '</details>'+
  '<button class="clay-btn" style="width:100%" onclick="Views.settings.saveAI()">保存当前账号</button>'+
  '<button class="clay-btn ghost" style="width:100%;margin-top:8px" onclick="Views.settings.testConn()">🔌 测试连接</button>'+
  '<p id="aiTestRes" style="margin:8px 0 0;font-size:13px;min-height:18px;color:var(--p700)"></p>'+
  '<p class="hint" style="margin-top:6px">🔒 配置仅保存在本机浏览器 localStorage，不上传任何服务器；对话只发给你选的这个 API。切到能看图的账号，晚饭照片→记热量、支付截图→记账。</p></div>'+

  '<div class="clay-card"><div class="sect" style="margin-top:0">🗂 '+SH.esc(VN)+' 的五层记忆</div>'+
  '<p class="hint" style="margin-bottom:8px">L1 近期上下文＝最近聊天 · 越重要的事记得越久，琐事会像人一样被遗忘；情感权重高的事更难忘。</p>'+
  Views.settings.memHtml()+'</div>'+

  '<div class="clay-card"><div class="sect" style="margin-top:0">😺 我的表情包</div>'+
  '<p class="hint" style="margin-bottom:8px">上传你手机里的表情包，聊天时直接发；'+SH.esc(VN)+' 也会在合适的时候用你的表情包回你。</p>'+
  Views.settings.stickersHtml()+'</div>'+
  '<div class="clay-card"><div class="sect" style="margin-top:0">💾 数据</div>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
  '<button class="clay-btn ghost" style="flex:1;min-width:120px" onclick="Views.settings.exportData()">导出备份</button>'+
  '<button class="clay-btn ghost" style="flex:1;min-width:120px" onclick="Views.settings.importData()">导入备份</button>'+
  '<button class="clay-btn ghost" style="flex:1;min-width:120px" onclick="Views.settings.clearAll()">清空全部数据</button></div>'+
  '<input type="file" id="st_import" accept="application/json,.json" style="display:none" onchange="Views.settings.doImportFile(this)">'+
  '<p class="hint" style="margin-top:10px">导出备份可下载一个 JSON 文件，换手机 / 重装后用「导入备份」恢复全部数据（覆盖当前）。所有数据仅保存在本设备浏览器中 · 北京时间 '+SH.hm()+'</p></div>';
},
stickersHtml: function(){
  var pack = SH.S.stickers||[];
  if(!pack.length) return '<p class="hint">还没有表情包。去「'+SH.esc(SH.vName())+'」聊天页，点输入框左边的 😺 图标即可上传。</p>';
  return '<div class="stgrid" style="margin-top:4px">'+pack.map(function(s,i){
    return '<div class="stcell" style="cursor:default"><img src="'+s.img+'"><i class="stdel" onclick="Views.settings.delSticker('+i+')">✕</i></div>';
  }).join('')+'</div>'+
  '<button class="clay-btn ghost" style="width:100%;margin-top:10px" onclick="Views.settings.pickSticker()">＋ 添加表情包</button>'+
  '<input type="file" id="st_stk_input" accept="image/*" multiple style="display:none" onchange="Views.settings.uploadStickers(this)">';
},
pickSticker: function(){ var el=document.getElementById('st_stk_input'); if(el) el.click(); },
uploadStickers: function(input){
  var files = Array.prototype.slice.call(input.files||[]); input.value='';
  if(!files.length) return;
  var pack = SH.S.stickers || (SH.S.stickers=[]); var done=0,total=files.length;
  files.forEach(function(f){
    SH.compressImg(f, 220, function(d){
      pack.push({id:SH.uid(), img:d, added:SH.today()});
      if(++done===total){ SH.save(); SH.refresh(); SH.toast('已添加 '+total+' 个表情包'); }
    });
  });
},
delSticker: function(i){ (SH.S.stickers||[]).splice(i,1); SH.save(); SH.refresh(); SH.toast('已删除'); },
memHtml: function(){
  var m = SH.S.memory;
  var layers = [['l5','L5 长期记忆（永久）'],['l4','L4 中期记忆（90天+）'],['l3','L3 中短期记忆（30天+）'],['l2','L2 近期记忆（7天内新事）']];
  return layers.map(function(L){
    var arr = m[L[0]];
    return '<div style="margin-bottom:8px"><b style="font-size:12px;color:var(--p500)">'+L[1]+' · '+arr.length+'条</b>'+
    (arr.length ? arr.slice(-5).map(function(it){
      return '<div class="row" style="padding:5px 2px;font-size:12px"><div class="grow '+(it.done?'done':'')+'">'+SH.esc(it.text)+'</div><span class="sub">w'+(it.w+it.emo)+'</span></div>';
    }).join('') : '')+'</div>';
  }).join('');
},
saveProfile: function(){
  var S = SH.S;
  var oldVn = SH.vName();
  S.profile.name = document.getElementById('st_name').value.trim();
  S.profile.vname = document.getElementById('st_vn').value.trim() || 'Victor';
  S.profile.weight = parseFloat(document.getElementById('st_w').value)||50;
  S.profile.kcalTarget = parseInt(document.getElementById('st_k').value)||1600;
  S.profile.burnTarget = parseInt(document.getElementById('st_b').value)||300;
  SH.save(); SH.toast('已保存');
  if(S.profile.vname !== oldVn){
    Victor.post('从今天起我叫「'+S.profile.vname+'」了。名字换了，管你的力度不变。');
  } else {
    Victor.post((S.profile.name||'好')+'，资料我更新了。以后就这么叫你了。');
  }
  SH.refresh();
},
toggleVoice: function(){
  SH.S.settings.voiceOn = !SH.S.settings.voiceOn;
  SH.save(); SH.refresh();
  if(SH.S.settings.voiceOn) SH.speak('语音已开启，我是'+SH.vName()+'。');
},
switchApi: function(i){
  var a = SH.S.settings.apis[i]; if(!a) return;
  SH.S.settings.api = JSON.parse(JSON.stringify(a));
  SH.S.settings._editIdx = i; Views.settings._editIdx = i;
  SH.save();
  Victor.ping();
  SH.toast('已切换到 '+a.name);
  var root = document.getElementById('content');
  if(root) Views.settings.render(root);
  Victor.renderApiDot();
},
testConn: function(){
  var el = document.getElementById('aiTestRes');
  if(!SH.S.settings.api || !SH.S.settings.api.key){ if(el) el.textContent='⚠️ 还没填 API Key（先选预设、填 Key、保存）'; return; }
  if(el) el.textContent='连接中…';
  Victor.ping();
  var n=0;
  var iv = setInterval(function(){
    var s = Victor.apiStatus;
    if((s.state==='ok'||s.state==='fail') && n>1 || n>=20){
      clearInterval(iv);
      if(el) el.textContent = (s.state==='ok'?'✅ 连接成功，模型 '+s.model+' 可用':'❌ '+s.err);
    }
    n++;
  }, 300);
},
saveAI: function(){
  var apis = SH.S.settings.apis; if(!apis) apis = SH.S.settings.apis = [];
  var idx = (Views.settings._editIdx!=null ? Views.settings._editIdx : 0);
  var key = document.getElementById('ai_k').value.trim();
  var base = document.getElementById('ai_b').value.trim();
  var model = document.getElementById('ai_m').value.trim();
  var vision = document.getElementById('ai_vision').checked;
  if(idx<0 || idx>=apis.length) idx = apis.length;
  if(!apis[idx]) apis[idx] = {name: model};
  apis[idx] = {name: apis[idx].name || model, base: base, model: model, key: key, vision: vision};
  SH.S.settings.api = JSON.parse(JSON.stringify(apis[idx]));
  SH.save(); SH.toast('已保存（'+apis[idx].name+'）');
  Victor.ping();
  if(key) Victor.post('嗯……感觉脑子突然清醒了很多。现在每次你找我，我都会先看一眼北京时间、翻一遍五层记忆、核对今天的接单排单再开口。'+(vision?'发张图片试试？':'（这个账号暂时看不了图，发图我认不出，但文字聊天没问题。）'));
  var root = document.getElementById('content'); if(root) Views.settings.render(root);
  Victor.renderApiDot();
},
exportData: function(){
  var blob = new Blob([JSON.stringify(SH.S)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'starhub-backup-'+SH.today()+'.json';
  a.click();
},
importData: function(){
  var el = document.getElementById('st_import');
  if(el) el.click();
},
doImportFile: function(input){
  var f = input.files && input.files[0];
  if(!f) return;
  var reader = new FileReader();
  reader.onload = function(){
    try{
      var data = JSON.parse(reader.result);
      if(!data || typeof data!=='object') throw new Error('bad');
      Views.settings._importData = data;
      SH.modal('<h3>导入备份？</h3><p style="font-size:13px;margin-bottom:14px">这会<b>覆盖</b>当前设备上的全部数据（接单、配件、创意、记忆、设置等）。确定要从备份文件恢复吗？</p>'+
        '<div style="display:flex;gap:8px"><button class="clay-btn ghost" style="flex:1" onclick="SH.closeModal()">取消</button>'+
        '<button class="clay-btn" style="flex:1" onclick="Views.settings.confirmImport()">确认导入</button></div>');
    }catch(e){ SH.toast('文件不是有效的备份 JSON'); }
    input.value='';
  };
  reader.readAsText(f);
},
confirmImport: function(){
  var data = Views.settings._importData; if(!data) return;
  try{ localStorage.setItem('starhub_order_v1', JSON.stringify(data)); }
  catch(e){ SH.toast('保存失败：本地存储不可用'); return; }
  SH.closeModal();
  SH.toast('导入成功，正在刷新…');
  setTimeout(function(){ location.reload(); }, 600);
},
clearAll: function(){
  SH.modal('<h3>确认清空？</h3><p style="font-size:13px;margin-bottom:14px">所有记录、记忆、聊天都会消失，无法恢复。</p>'+
  '<div style="display:flex;gap:8px"><button class="clay-btn ghost" style="flex:1" onclick="SH.closeModal()">取消</button>'+
  '<button class="clay-btn" style="flex:1" onclick="localStorage.clear();location.reload()">确认清空</button></div>');
}};
})();
