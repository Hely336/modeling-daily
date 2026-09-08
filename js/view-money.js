/* 记账：上传支付截图识别 + 手动记账 */
(function(){
var CATS = ['餐饮','购物','交通','娱乐','美妆','健身','学习','其他'];
var pendingShot = null;

Views.money = { render: function(root){
  var S = SH.S, t = SH.today();
  var month = t.slice(0,7);
  var mExp = S.expenses.filter(function(x){return x.date.slice(0,7)===month;});
  var mSum = 0, tSum = 0;
  mExp.forEach(function(x){ mSum += x.amount; if(x.date===t) tSum += x.amount; });
  var byCat = {};
  mExp.forEach(function(x){ byCat[x.cat] = (byCat[x.cat]||0)+x.amount; });

  root.innerHTML =
  '<div class="vhead">'+SH.icon('coin')+'<h2>记账</h2></div>'+
  '<div class="grid2" style="margin-bottom:16px">'+
    '<div class="stat"><div class="v">¥'+tSum.toFixed(2)+'</div><div class="l">今日支出</div></div>'+
    '<div class="stat"><div class="v">¥'+mSum.toFixed(2)+'</div><div class="l">本月支出</div></div>'+
  '</div>'+
  '<div class="clay-card"><div class="sect" style="margin-top:0">📸 上传支付截图</div>'+
  '<p class="hint" style="margin-bottom:10px">上传微信/支付宝支付截图，自动生成账单（配置 AI 后可全自动识别金额）</p>'+
  '<div style="display:flex;gap:8px">'+
  '<label class="clay-btn" style="flex:1">'+SH.icon('camera','white')+' 上传截图<input type="file" accept="image/*" style="display:none" onchange="Views.money.shot(this)"></label>'+
  '<button class="clay-btn ghost" style="flex:1" onclick="Views.money.manual()">✏️ 手动记一笔</button></div></div>'+

  (Object.keys(byCat).length ? '<div class="clay-card"><div class="sect" style="margin-top:0">本月分类</div>'+
  Object.keys(byCat).sort(function(a,b){return byCat[b]-byCat[a];}).map(function(c){
    return '<div class="row"><div class="grow" style="font-size:14px">'+c+'</div><b style="color:var(--p600)">¥'+byCat[c].toFixed(2)+'</b></div>'+
    '<div class="bar" style="height:8px;margin:2px 0 8px"><i style="width:'+(byCat[c]/mSum*100)+'%"></i></div>';
  }).join('')+'</div>' : '')+

  '<div class="clay-card"><div class="sect" style="margin-top:0">账单明细</div>'+
  (S.expenses.length ? S.expenses.slice().reverse().slice(0,40).map(function(x){
    return '<div class="row">'+(x.img?'<img src="'+x.img+'" style="width:38px;height:38px;border-radius:12px;object-fit:cover">':'<span style="font-size:17px">'+x.cat.split(' ')[1]+'</span>')+
    '<div class="grow"><b style="color:var(--p700)">'+SH.esc(x.note||x.cat.split(' ')[0])+'</b><div class="sub">'+x.date+' · '+x.cat.split(' ')[0]+(x.img?' · 截图识别':'')+'</div></div>'+
    '<b style="color:var(--p600)">-¥'+x.amount.toFixed(2)+'</b>'+
    '<button onclick="Views.money.del(\''+x.id+'\')">'+SH.icon('trash')+'</button></div>';
  }).join('') : '<p class="empty">还没有账单</p>')+'</div>';
},
shot: function(input){
  var f = input.files[0]; if(!f) return;
  SH.compressImg(f, 360, function(dataUrl){
    pendingShot = dataUrl;
    input.value = '';
    var api = SH.S.settings.api;
    if(api.key){
      SH.toast('AI 识别中…');
      Victor.ai('这是一张支付截图，请只回复JSON：{"amount":金额数字,"note":"商家或用途"}', dataUrl, function(ans){
        var amt = 0, note = '';
        try{ var j = JSON.parse((ans||'').replace(/```json|```/g,'').trim()); amt = parseFloat(j.amount)||0; note = j.note||''; }catch(e){}
        Views.money.confirm(amt, note);
      });
    } else {
      Views.money.confirm(0, '');
    }
  });
},
confirm: function(amt, note){
  SH.modal('<h3>确认账单</h3>'+
  '<img src="'+pendingShot+'" style="width:100%;max-height:180px;object-fit:contain;border-radius:16px;margin-bottom:12px;background:var(--bg);box-shadow:var(--sh-in-s);padding:8px">'+
  '<div class="grid2"><div class="mrow"><label>金额 ¥</label><input class="clay-input" id="ex_a" type="number" value="'+(amt||'')+'" placeholder="0.00"></div>'+
  '<div class="mrow"><label>分类</label><select class="clay-input" id="ex_c">'+CATS.map(function(c){return '<option>'+c+'</option>';}).join('')+'</select></div></div>'+
  '<div class="mrow"><label>备注</label><input class="clay-input" id="ex_n" value="'+SH.esc(note)+'" placeholder="如：一点点奶茶"></div>'+
  '<button class="clay-btn big" style="width:100%" onclick="Views.money.save(true)">入账</button>');
},
manual: function(){
  pendingShot = null;
  SH.modal('<h3>手动记账</h3>'+
  '<div class="grid2"><div class="mrow"><label>金额 ¥</label><input class="clay-input" id="ex_a" type="number" placeholder="0.00"></div>'+
  '<div class="mrow"><label>分类</label><select class="clay-input" id="ex_c">'+CATS.map(function(c){return '<option>'+c+'</option>';}).join('')+'</select></div></div>'+
  '<div class="mrow"><label>备注</label><input class="clay-input" id="ex_n" placeholder="花在哪儿了"></div>'+
  '<button class="clay-btn big" style="width:100%" onclick="Views.money.save(false)">入账</button>');
},
save: function(withImg){
  var amt = parseFloat(document.getElementById('ex_a').value);
  if(!amt) return SH.toast('金额还没填哦');
  SH.S.expenses.push({id:SH.uid(), date:SH.today(), amount:amt,
    cat:document.getElementById('ex_c').value, note:document.getElementById('ex_n').value.trim(),
    img:withImg?pendingShot:null});
  pendingShot = null;
  SH.save(); SH.closeModal(); SH.refresh();
  if(amt >= 200) Victor.post('刚记了一笔 ¥'+amt.toFixed(2)+'？嗯……不小的一笔，买得开心就好，但这个月的预算我可帮你盯着呢。');
},
del: function(id){
  SH.S.expenses = SH.S.expenses.filter(function(x){return x.id!==id;});
  SH.save(); SH.refresh();
}};
})();
