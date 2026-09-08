/* 创意灵感：每日热门捏捏款式图片收集 · 改名 · 分类 · 来源 · 删除 */
(function(){
/* 捏捏款式分类 */
var CATS = ['食物系','动物系','植物系','OC/人物系','场景系','盲盒系','解压系','其他'];
function getList(){
  if(!SH.S.ideas) SH.S.ideas = [];
  return SH.S.ideas;
}
var pendingPic;
var filter = 'all';   /* all / today / 某分类 */
var today = SH.today();

function isUrl(s){ return /^https?:\/\//i.test((s||'').trim()); }

function card(d){
  var catBadge = d.category ? '<span class="pill pill-cat">'+SH.esc(d.category)+'</span>' : '';
  var dateBadge = d.date ? '<span class="pill pill-date">'+SH.esc(d.date)+(d.date===today?' · 今日':'')+'</span>' : '';
  var srcHtml = d.src
    ? (isUrl(d.src)
        ? '<a class="ideasrc" href="'+SH.esc(d.src)+'" target="_blank" rel="noopener">'+SH.icon('tag','sm')+' 来源</a>'
        : '<span class="ideasrc">'+SH.icon('tag','sm')+' '+SH.esc(d.src)+'</span>')
    : '';
  var picHtml = d.pic
    ? '<img class="accthumb" src="'+d.pic+'" onclick="Views.idea.big(\''+d.id+'\')" alt="'+SH.esc(d.title||'')+'">'
    : '<div class="accthumb ph" onclick="Views.idea.big(\''+d.id+'\')">'+SH.icon('bulb','lg')+'</div>';
  return '<div class="clay-card acccard">'+
    picHtml+
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px">'+
      '<b style="color:var(--p700);font-size:14px">'+SH.esc(d.title||'未命名款式')+'</b>'+
    '</div>'+
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px">'+catBadge+dateBadge+'</div>'+
    (d.note?'<div class="sub" style="margin-top:2px">'+SH.esc(d.note)+'</div>':'')+
    (srcHtml?'<div style="margin-top:4px">'+srcHtml+'</div>':'')+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
      '<button class="clay-btn mini" onclick="Views.idea.edit(\''+d.id+'\')">'+SH.icon('edit')+'编辑</button>'+
      '<button class="clay-btn mini ghost" style="margin-left:auto" onclick="Views.idea.del(\''+d.id+'\')">'+SH.icon('trash')+'</button>'+
    '</div>'+
  '</div>';
}

Views.idea = {
render: function(root){
  var all = getList().slice();
  all.sort(function(a,b){ var x=(b.date||b.created||''), y=(a.date||a.created||''); return x>y?1:(x<y?-1:0); });
  var used = CATS.filter(function(c){ return all.some(function(d){return d.category===c;}); });
  var list;
  if(filter==='all') list = all;
  else if(filter==='today') list = all.filter(function(d){ return (d.date||'')===today; });
  else list = all.filter(function(d){ return d.category===filter; });

  var segs = [
    '<button class="'+(filter==='all'?'on':'')+'" onclick="Views.idea.setFilter(\'all\')">全部</button>',
    '<button class="'+(filter==='today'?'on':'')+'" onclick="Views.idea.setFilter(\'today\')">今日</button>'
  ].concat(used.map(function(c){ return '<button class="'+(filter===c?'on':'')+'" onclick="Views.idea.setFilter(\''+c+'\')">'+c+'</button>'; })).join('');

  var todayCount = all.filter(function(d){ return (d.date||'')===today; }).length;

  root.innerHTML =
  '<div class="vhead">'+SH.icon('bulb')+'<h2>创意灵感</h2>'+
  '<div class="right"><button class="clay-btn mini" onclick="Views.idea.edit()">'+SH.icon('plus','white')+' 加灵感</button></div></div>'+
  '<div class="sect" style="margin-top:0">'+SH.icon('tag')+'共 '+all.length+' 个款式'+(todayCount?(' · 今日 '+todayCount+' 个'):'')+(filter!=='all'?(' · '+filter):'')+'</div>'+
  '<div class="clay-card sm"><p class="hint">'+SH.icon('bulb')+' 这里用来收集每日热门的捏捏款式。看到小红书 / 抖音 / 闲鱼上喜欢的款，保存图片或贴链接进来，按日期和分类整理，方便照着练手和找灵感。</p></div>'+
  (used.length||filter==='today'?'<div class="seg">'+segs+'</div>':'')+
  (list.length
    ? '<div class="accgrid">'+list.map(card).join('')+'</div>'
    : '<div class="clay-card"><p class="empty">'+(all.length?'这个分类下还没有款式':(filter==='today'?'今天还没收集到热门款式，看到喜欢的就点右上角「加灵感」收进来吧':'还没有款式，点右上角「加灵感」把热门捏捏款式收进来吧'))+'</p></div>')+
  '<div class="clay-card sm"><p class="hint">'+SH.icon('chat')+' 跟 '+SH.esc(SH.vName())+' 说「收藏个捏捏款式：食物系，链接xxx」也能收进来。</p></div>';
},

setFilter: function(f){ filter = f; SH.refresh(); },

edit: function(id){
  var d = id ? (getList().filter(function(x){return x.id===id;})[0]) : null;
  pendingPic = d ? d.pic : undefined;
  SH.modal('<h3>'+(d?'编辑款式':'收集灵感')+'</h3>'+
  '<div class="mrow"><label>款式名称（可改名）</label><input class="clay-input" id="id_title" value="'+SH.esc(d?(d.title||''):'')+'" placeholder="如：草莓大福捏捏、柴犬团子"></div>'+
  '<div class="mrow"><label>捏捏分类</label><select class="clay-input" id="id_cat">'+
    ['',''].concat(CATS).map(function(c){ return '<option value="'+c+'"'+(d&&d.category===c?' selected':'')+'>'+(c||'不填')+'</option>'; }).join('')+
  '</select></div>'+
  '<div class="mrow"><label>日期（默认今天）</label><input class="clay-input" id="id_date" type="date" value="'+SH.esc(d?(d.date||today):today)+'"></div>'+
  '<div class="mrow"><label>款式图片</label>'+
    '<div id="id_picbox" style="display:flex;align-items:center;gap:10px">'+
      (d&&d.pic?'<img src="'+d.pic+'" style="width:64px;height:64px;object-fit:cover;border-radius:14px">':'<span class="hint">未上传</span>')+
      '<label class="clay-btn mini" style="cursor:pointer">上传图片<input id="id_pic" type="file" accept="image/*" style="display:none" onchange="Views.idea.pick(event)"></label>'+
    '</div>'+
    '<div style="margin-top:6px"><input class="clay-input" id="id_url" value="'+SH.esc(d&&d.pic&&isUrl(d.pic)?d.pic:'')+'" placeholder="或粘贴图片链接（小红书/抖音/闲鱼）" oninput="Views.idea.useUrl(this.value)"></div>'+
  '</div>'+
  '<div class="mrow"><label>来源 / 备注</label><input class="clay-input" id="id_src" value="'+SH.esc(d?(d.src||''):'')+'" placeholder="如：小红书 xxx、抖音 @xxx，或记录灵感点"></div>'+
  '<button class="clay-btn big" style="width:100%" onclick="Views.idea.save('+(d?'\''+d.id+'\'':'null')+')">保存</button>'+
  (d?'<button class="clay-btn ghost" style="width:100%;margin-top:8px" onclick="Views.idea.del(\''+d.id+'\')">删除这个款式</button>':''));
},

pick: function(ev){
  var f = ev.target.files && ev.target.files[0];
  if(!f) return;
  SH.compressImg(f, 800, function(d){
    pendingPic = d;
    document.getElementById('id_url').value = '';
    document.getElementById('id_picbox').innerHTML =
      '<img src="'+d+'" style="width:64px;height:64px;object-fit:cover;border-radius:14px">'+
      '<label class="clay-btn mini" style="cursor:pointer">重传<input id="id_pic" type="file" accept="image/*" style="display:none" onchange="Views.idea.pick(event)"></label>';
  });
},

useUrl: function(v){
  if(isUrl(v)){ pendingPic = v.trim(); }
},

save: function(id){
  var title = document.getElementById('id_title').value.trim();
  if(!title) return SH.toast('款式名称还没填哦');
  var cat = document.getElementById('id_cat').value;
  var date = document.getElementById('id_date').value || today;
  var url = document.getElementById('id_url').value.trim();
  var note = document.getElementById('id_note') ? document.getElementById('id_note').value.trim() : '';
  var src = document.getElementById('id_src').value.trim();
  /* 图片来源：上传优先，其次链接框 */
  var pic = pendingPic;
  if(id){ var old = getList().filter(function(x){return x.id===id;})[0]; if(old && pendingPic===undefined) pic = old.pic; }
  if(!pic && isUrl(url)) pic = url;
  if(id){
    getList().forEach(function(d){ if(d.id===id){ d.title=title; d.category=cat; d.date=date; d.src=src; d.note=note; if(pendingPic!==undefined) d.pic=pendingPic; } });
  } else {
    getList().push({id:SH.uid(), title:title, category:cat, date:date, src:src, note:note, pic:pic||'', created:SH.today()});
  }
  pendingPic = undefined;
  SH.save(); SH.closeModal(); SH.refresh();
  SH.toast(id?'已更新 ✨':'已收进创意灵感 💡');
},

del: function(id){
  if(!confirm('确定删除这个款式收集？删除后不可恢复。')) return;
  SH.S.ideas = getList().filter(function(x){return x.id!==id;});
  SH.save(); SH.closeModal(); SH.refresh();
  SH.toast('已删除');
},

big: function(id){
  var d = id ? (getList().filter(function(x){return x.id===id;})[0]) : null;
  if(d && d.pic) SH.modal('<img src="'+d.pic+'" style="width:100%;border-radius:16px">');
  else SH.toast('这个款式还没有上传图片');
}
};
})();
