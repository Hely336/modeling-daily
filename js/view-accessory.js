/* 配件库：整理已做好的配件模型 · 图片 · 改名 · 分类 · 删除
   支持「从已有模型选择」：从已做好的接单/自建模型里挑一个，自动带入名称与展示图 */
(function(){
var CATS = ['装饰品','道具','服饰','动物配件','植物','机械零件','配件','其他'];
function getList(){
  if(!SH.S.accessories) SH.S.accessories = [];
  return SH.S.accessories;
}
var pendingPic;
var pendingSourceId = null;  /* 「从已有模型选择」时记住来源模型的 id，便于授权页过滤 */
var editingId = null;   /* 当前正在编辑的配件 id（从模型选择时保留） */

function card(a){
  var catBadge = a.category ? '<span class="pill pill-cat">'+SH.esc(a.category)+'</span>' : '';
  var picHtml = a.pic
    ? '<img class="accthumb" src="'+a.pic+'" onclick="Views.acc.big(\''+a.id+'\')" alt="'+SH.esc(a.name||'')+'">'
    : '<div class="accthumb ph" onclick="Views.acc.big(\''+a.id+'\')">'+SH.icon('box','lg')+'</div>';
  return '<div class="clay-card acccard">'+
    picHtml+
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px">'+
      '<b style="color:var(--p700);font-size:14px">'+SH.esc(a.name||'未命名配件')+'</b>'+catBadge+
    '</div>'+
    (a.note?'<div class="sub" style="margin-top:2px">'+SH.esc(a.note)+'</div>':'')+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
      '<button class="clay-btn mini" onclick="Views.acc.edit(\''+a.id+'\')">'+SH.icon('edit')+'编辑</button>'+
      '<button class="clay-btn mini ghost" style="margin-left:auto" onclick="Views.acc.del(\''+a.id+'\')">'+SH.icon('trash')+'</button>'+
    '</div>'+
  '</div>';
}

/* 弹出新增/编辑配件表单；opts={id,name,cat,note,pic} */
function renderForm(o){
  var id = o.id || null;
  editingId = id;
  pendingPic = (o.pic!==undefined) ? o.pic : undefined;
  var catOpts = ['',''].concat(CATS).map(function(c){ return '<option value="'+c+'"'+(o.cat===c?' selected':'')+'>'+(c||'不填')+'</option>'; }).join('');
  SH.modal('<h3>'+(id?'编辑配件':'新增配件')+'</h3>'+
  '<button class="clay-btn ghost" style="width:100%;margin-bottom:12px" onclick="Views.acc.pickFromModel()">'+SH.icon('cube')+'从已有模型选择</button>'+
  '<div class="mrow"><label>配件名称（可改名）</label><input class="clay-input" id="ac_name" value="'+SH.esc(o.name||'')+'" placeholder="如：花朵发饰、机械齿轮"></div>'+
  '<div class="mrow"><label>分类</label><select class="clay-input" id="ac_cat">'+catOpts+'</select></div>'+
  '<div class="mrow"><label>配件图片</label>'+
    '<div id="ac_picbox" style="display:flex;align-items:center;gap:10px">'+
      (o.pic?'<img src="'+o.pic+'" style="width:64px;height:64px;object-fit:cover;border-radius:14px">':'<span class="hint">未上传</span>')+
      '<label class="clay-btn mini" style="cursor:pointer">上传<input id="ac_pic" type="file" accept="image/*" style="display:none" onchange="Views.acc.pick(event)"></label>'+
    '</div></div>'+
  '<div class="mrow"><label>备注</label><input class="clay-input" id="ac_note" value="'+SH.esc(o.note||'')+'" placeholder="如：含贴图、可做变形"></div>'+
  '<button class="clay-btn big" style="width:100%" onclick="Views.acc.save('+(id?'\''+id+'\'':'null')+')">保存</button>'+
  (id?'<button class="clay-btn ghost" style="width:100%;margin-top:8px" onclick="Views.acc.del(\''+id+'\')">删除这件配件</button>':''));
}

Views.acc = {
render: function(root){
  var all = getList().slice();
  all.sort(function(a,b){ return (b.created||'') > (a.created||'') ? 1 : -1; });
  var used = CATS.filter(function(c){ return all.some(function(a){return a.category===c;}); });
  var list = filter==='all' ? all : all.filter(function(a){return a.category===filter;});

  var segs = ['<button class="'+(filter==='all'?'on':'')+'" onclick="Views.acc.setFilter(\'all\')">全部</button>']
    .concat(used.map(function(c){ return '<button class="'+(filter===c?'on':'')+'" onclick="Views.acc.setFilter(\''+c+'\')">'+c+'</button>'; }))
    .join('');

  root.innerHTML =
  '<div class="vhead">'+SH.icon('box')+'<h2>配件库</h2>'+
  '<div class="right"><button class="clay-btn mini" onclick="Views.acc.edit()">'+SH.icon('plus','white')+'新配件</button></div></div>'+
  '<div class="sect" style="margin-top:0">'+SH.icon('tag')+'共 '+all.length+' 件配件'+(filter!=='all'?(' · '+filter):'')+'</div>'+
  (used.length?'<div class="seg">'+segs+'</div>':'')+
  (list.length
    ? '<div class="accgrid">'+list.map(card).join('')+'</div>'
    : '<div class="clay-card"><p class="empty">'+(all.length?'这个分类下还没有配件':'还没有配件，点右上角「新配件」把做好的配件收进来吧')+'</p></div>')+
  '<div class="clay-card sm"><p class="hint">'+SH.icon('chat')+' 跟 '+SH.esc(SH.vName())+' 说「做了个花朵发饰配件，分类装饰品」也能收进配件库；新增时可「从已有模型选择」一键带入图。</p></div>';
},

setFilter: function(f){ filter = f; SH.refresh(); },

edit: function(id){
  var a = id ? (getList().filter(function(x){return x.id===id;})[0]) : null;
  renderForm({id:id, name:a?(a.name||''):'', cat:a?a.category:'', note:a?a.note:'', pic:a?a.pic:''});
},

/* 从已有模型选择：列出已做好的模型（自建模型 或 已结单的客订），带入名称+展示图 */
pickFromModel: function(){
  var models = (SH.S.orders||[]).filter(function(o){
    return o.type==='self' || !!o.end;
  });
  if(!models.length){ SH.toast('还没有做好的模型可挑选'); return; }
  var items = models.map(function(o){
    var pic = o.pic
      ? '<img src="'+o.pic+'" style="width:48px;height:48px;object-fit:cover;border-radius:12px;flex:0 0 auto">'
      : '<span style="width:48px;height:48px;border-radius:12px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:var(--p50);box-shadow:var(--sh-in-s);color:var(--p300);font-size:10px;text-align:center">无图</span>';
    return '<button class="clay-card sm" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;margin:0 0 10px;cursor:pointer" onclick="Views.acc.chooseModel(\''+o.id+'\')">'+pic+
      '<div class="grow"><b style="color:var(--p700);font-size:14px">'+SH.esc(o.name||'未命名模型')+'</b>'+
      '<div class="sub">'+(o.category?SH.esc(o.category):'')+(o.type==='self'?' · 自设':' · 客订')+'</div></div></button>';
  }).join('');
  SH.modal('<h3>从已有模型选择</h3><p class="hint" style="margin-bottom:12px">挑一个做好的模型，自动带入名称和展示图</p>'+items);
},
chooseModel: function(id){
  var o = (SH.S.orders||[]).filter(function(x){return x.id===id;})[0];
  if(!o) return;
  pendingSourceId = id;   /* 记住来源模型，保存时写入配件，授权页据此过滤 */
  var curCat = (document.getElementById('ac_cat')||{}).value || '';
  var curNote = (document.getElementById('ac_note')||{}).value || '';
  renderForm({id:editingId, name:o.name||'', cat:curCat, note:curNote, pic:o.pic||''});
},

pick: function(ev){
  var f = ev.target.files && ev.target.files[0];
  if(!f) return;
  SH.compressImg(f, 800, function(d){
    pendingPic = d;
    document.getElementById('ac_picbox').innerHTML =
      '<img src="'+d+'" style="width:64px;height:64px;object-fit:cover;border-radius:14px">'+
      '<label class="clay-btn mini" style="cursor:pointer">重传<input id="ac_pic" type="file" accept="image/*" style="display:none" onchange="Views.acc.pick(event)"></label>';
  });
},

save: function(id){
  var name = document.getElementById('ac_name').value.trim();
  if(!name) return SH.toast('配件名称还没填哦');
  var cat = document.getElementById('ac_cat').value;
  var note = document.getElementById('ac_note').value.trim();
  if(id){
    getList().forEach(function(a){ if(a.id===id){ a.name=name; a.category=cat; a.note=note; if(pendingPic!==undefined) a.pic=pendingPic; if(pendingSourceId) a.sourceId=pendingSourceId; } });
  } else {
    getList().push({id:SH.uid(), name:name, category:cat, note:note, pic:pendingPic||'', sourceId:pendingSourceId||'', created:SH.today()});
  }
  pendingPic = undefined; pendingSourceId = null;
  SH.save(); SH.closeModal(); SH.refresh();
  SH.toast(id?'已更新 ✨':'已收进配件库 💪');
},

del: function(id){
  if(!confirm('确定删除这件配件？删除后不可恢复。')) return;
  SH.S.accessories = getList().filter(function(x){return x.id!==id;});
  SH.save(); SH.closeModal(); SH.refresh();
  SH.toast('已删除');
},

big: function(id){
  var a = id ? (getList().filter(function(x){return x.id===id;})[0]) : null;
  if(a && a.pic) SH.modal('<img src="'+a.pic+'" style="width:100%;border-radius:16px">');
  else SH.toast('这件配件还没有上传图片');
}
};
var filter = 'all';
})();
