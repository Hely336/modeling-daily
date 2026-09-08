/* 番茄钟专注模式：切走刷手机 → Victor 夺命连环 call */
(function(){
var F = {run:false, paused:false, left:25*60, total:25*60, timer:null, strikes:0};
var SCOLD = [
  '喂？？我看到你切出去了。专注时间刷什么小红书？回来！',
  '第二次了啊。番茄钟还没结束你的手指头在干嘛？我数到三，1、2……',
  '你是不是觉得我看不见？？第三次了！再切出去我今晚的睡前提醒改成夺命连环call！',
  '行，你赢了。我已经把这件事记进长期记忆了——「专注力堪忧，需重点管理」。哼，快回来做完这一个番茄。'
];

function fmt(s){ return ('0'+Math.floor(s/60)).slice(-2)+':'+('0'+s%60).slice(-2); }

function onVis(){
  if(document.hidden && F.run && !F.paused){
    F.strikes++;
    if(navigator.vibrate) navigator.vibrate([300,100,300]);
  } else if(!document.hidden && F.strikes>0 && F.run){
    var msg = SCOLD[Math.min(F.strikes-1, SCOLD.length-1)];
    showCall(msg);
    if(F.strikes>=4) Victor.remember('专注模式屡次分心刷手机（'+SH.today()+'）', 6, {emo:1});
  }
}
document.addEventListener('visibilitychange', onVis);

function ring(){
  try{
    var ctx = new (window.AudioContext||window.webkitAudioContext)();
    var t = ctx.currentTime;
    for(var i=0;i<4;i++){
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = i%2? 880:660;
      g.gain.setValueAtTime(.14, t+i*.35);
      g.gain.exponentialRampToValueAtTime(.001, t+i*.35+.3);
      o.start(t+i*.35); o.stop(t+i*.35+.3);
    }
  }catch(e){}
}
function showCall(msg){
  var ov = document.getElementById('callOverlay');
  document.getElementById('callAva').textContent = SH.vName().slice(0,1).toUpperCase();
  document.getElementById('callTitle').textContent = SH.vName()+' 来电…';
  document.getElementById('callMsg').textContent = '（未接来电 ×'+F.strikes+'）';
  ov.dataset.msg = msg;
  ov.classList.add('show');
  ring();
  if(navigator.vibrate) navigator.vibrate([400,150,400,150,400]);
}
window.answerCall = function(){
  var ov = document.getElementById('callOverlay');
  var msg = ov.dataset.msg;
  ov.classList.remove('show');
  Victor.post(msg, {voice:true});
  SH.go('chat');
};
window.rejectCall = function(){
  document.getElementById('callOverlay').classList.remove('show');
  setTimeout(function(){ if(F.run && F.strikes>0) Victor.post('挂我电话？？'+(SH.S.profile.name||'')+'，你胆子越来越大了。专注做完这个番茄，回头再跟你算账。', {voice:true}); }, 800);
};

Views.focus = { render: function(root){
  var S = SH.S, t = SH.today();
  var today = S.focus.sessions.filter(function(x){return x.date===t;});
  var tm = 0; today.forEach(function(x){tm+=x.min;});
  root.innerHTML =
  '<div class="vhead">'+SH.icon('timer')+'<h2>专注模式</h2><span class="hint">🍅 番茄钟</span></div>'+
  '<div class="clay-card" style="text-align:center">'+
    '<div class="focus-ring"><div class="tm" id="ftime">'+fmt(F.left)+'</div>'+
    '<div class="st" id="fstate">'+(F.run?(F.paused?'已暂停':'专注中… '+SH.esc(SH.vName())+' 正在盯着'):'准备好了吗？')+'</div></div>'+
    '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'+
    (F.run
      ? '<button class="clay-btn" onclick="Views.focus.pause()">'+(F.paused?'继续':'暂停')+'</button>'+
        '<button class="clay-btn ghost" onclick="Views.focus.stop(false)">放弃</button>'
      : '<button class="clay-btn big" onclick="Views.focus.start(25)">🍅 25分钟</button>'+
        '<button class="clay-btn" onclick="Views.focus.start(45)">45分钟</button>'+
        '<button class="clay-btn ghost" onclick="Views.focus.start(5)">5分钟休息</button>')+
    '</div>'+
    '<p class="hint" style="margin-top:14px">⚠️ 专注期间切出去刷手机，会接到 '+SH.esc(SH.vName())+' 的夺命连环 call（真的会骂人）</p>'+
  '</div>'+
  '<div class="grid2"><div class="stat"><div class="v">'+today.length+'</div><div class="l">今日番茄数</div></div>'+
  '<div class="stat"><div class="v">'+tm+'</div><div class="l">今日专注分钟</div></div></div>';
},
start: function(min){
  F.run = true; F.paused = false; F.left = min*60; F.total = min*60; F.strikes = 0;
  clearInterval(F.timer);
  F.timer = setInterval(Views.focus.tick, 1000);
  Victor.post('番茄钟开始，'+min+'分钟。这段时间你的手机归我管——除了这个App，哪儿都不许去。', {voice:false});
  SH.refresh();
},
tick: function(){
  if(F.paused) return;
  F.left--;
  var el = document.getElementById('ftime');
  if(el) el.textContent = fmt(F.left);
  if(F.left<=0) Views.focus.stop(true);
},
pause: function(){ F.paused = !F.paused; SH.refresh(); },
stop: function(finished){
  clearInterval(F.timer);
  var min = Math.round((F.total-F.left)/60);
  F.run = false;
  if(finished){
    SH.S.focus.sessions.push({date:SH.today(), min:Math.round(F.total/60)});
    SH.save();
    SH.speak('番茄钟完成！');
    Victor.post('🍅 完成！'+Math.round(F.total/60)+'分钟专注'+(F.strikes?'，虽然中途溜了'+F.strikes+'次…下次给我做到零分心。':'，全程零分心，我要表扬你。'), {voice:true});
  } else if(min>=1){
    SH.S.focus.sessions.push({date:SH.today(), min:min});
    SH.save();
    Victor.post('提前结束了？做了'+min+'分钟也算数。不过下次，坚持到底。');
  }
  F.left = 25*60; F.total = 25*60;
  SH.refresh();
}};
})();
