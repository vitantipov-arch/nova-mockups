/* NovaScheme — единый рендерер схемы агрегата (v3, согласовано 2026-07-02).
   Абстракция: вал = линия, опора = засечки + кружок-номер (в сессии — светофор),
   машина = контур корпуса (охватывает опоры, если рабочий орган межопорный и машина
   одна в центре вала) + закрашенный блок рабочего органа. Передачи: муфты с фланцами
   (упругая — с оранжевым элементом), ремень со шкивами, зубчатая пара.
   Используется из create.html (mode edit) и session.html (светофоры). */
window.NovaScheme = (function(){
  'use strict';
  var MT={ motor:{name:'Двигатель',color:'#4d8dff'}, pump:{name:'Насос',color:'#38e1d6'},
           fan:{name:'Вентилятор',color:'#ff5db1'}, comp:{name:'Компрессор',color:'#ffb24d'},
           gen:{name:'Генератор',color:'#9b6cff'} };
  var LINKS={ rigid:{off:false}, elastic:{off:false}, belt:{off:true}, gear:{off:true} };
  var ZC={g:'#97c459',y:'#ef9f27',r:'#e24b4a'};
  var GAPC=34, RH=138, KW=64;
  var O='h';

  function PT(a,c){ return O==='h'?[a,c]:[c,a]; }
  function ln(a0,c0,a1,c1,st,w){ var p=PT(a0,c0),q=PT(a1,c1);
    return '<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+st+'" stroke-width="'+w+'" stroke-linecap="round"/>'; }
  function rc(a0,a1,c0,c1,at){ var p=PT(a0,c0),q=PT(a1,c1); var x=Math.min(p[0],q[0]),y=Math.min(p[1],q[1]);
    return '<rect x="'+x+'" y="'+y+'" width="'+Math.abs(q[0]-p[0])+'" height="'+Math.abs(q[1]-p[1])+'" '+at+'/>'; }
  function tx(a,c,s,fill,sz,anch){ var p=PT(a,c);
    return '<text x="'+p[0]+'" y="'+p[1]+'" font-size="'+(sz||10.5)+'" fill="'+fill+'" text-anchor="'+(anch||'middle')+'" dominant-baseline="middle">'+s+'</text>'; }
  function cir(a,c,r,at){ var p=PT(a,c); return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+r+'" '+at+'/>'; }

  // раскладка одного вала: машины по позициям, зона опор s0..s1
  function locLayout(u){
    var L=[],C=[],R=[];
    (u.machines||[]).forEach(function(m){ var p=m.pos||'center'; (p==='left'?L:(p==='right'?R:C)).push(m); });
    var x=4, mach=[];
    L.forEach(function(m){ mach.push({m:m,a0:x,a1:x+KW,organA:x+KW-26,organW:28,wrap:false}); x+=KW+12; });
    var s0=x+16;
    var span=C.length===0?78:(C.length===1?118:C.length*62+28);
    var s1=s0+span;
    if(C.length===1){ mach.push({m:C[0],a0:s0-18,a1:s1+18,organA:(s0+s1)/2,organW:Math.min(92,Math.round(span*0.56)),wrap:true}); }
    else if(C.length>1){ var cx=s0+18; C.forEach(function(m){ mach.push({m:m,a0:cx,a1:cx+54,organA:cx+27,organW:26,wrap:false}); cx+=62; }); }
    x=s1+16;
    R.forEach(function(m){ mach.push({m:m,a0:x+10,a1:x+10+KW,organA:x+10+26,organW:28,wrap:false}); x+=KW+22; });
    return {W:x+6, s0:s0, s1:s1, mach:mach};
  }

  function layout(units,trans){
    var P=[];
    units.forEach(function(u,i){ var LL=locLayout(u), W=LL.W, p={W:W,LL:LL};
      if(i===0){ p.aMin=0; p.aMax=W; p.c=0; p.dir=1; p.outA=W; }
      else{ var T=trans[i-1]||{type:'elastic'}, pr=P[i-1];
        if(!LINKS[T.type].off){ p.dir=pr.dir; p.c=pr.c;
          if(p.dir>0){ p.aMin=pr.outA+GAPC; p.aMax=p.aMin+W; } else { p.aMax=pr.outA-GAPC; p.aMin=p.aMax-W; }
          p.outA=(p.dir>0?p.aMax:p.aMin); p.coup=true; p.ca=(pr.outA+(p.dir>0?p.aMin:p.aMax))/2; p.ct=T.type; }
        else{ var bs=(T.beltDir==='up')?-1:1; p.c=pr.c+bs*RH; p.beltA=pr.outA; p.c1=pr.c; p.c2=p.c;
          p.dir=(T.nextDir==='left')?-1:1;
          if(p.dir>0){ p.aMin=pr.outA; p.aMax=pr.outA+W; } else { p.aMax=pr.outA; p.aMin=pr.outA-W; }
          p.outA=(p.dir>0?p.aMax:p.aMin); p.belt=true; p.ct=T.type; }
      }
      P.push(p);
    });
    return P;
  }

  function supNum(units,i,k){ var n=0; for(var x=0;x<i;x++) n+=(units[x].supports||[]).length; return n+k+1; }

  function drawUnitFull(units,u,p,i,opts,out){
    var LL=p.LL, a0=p.aMin, c=p.c;
    var unitHit='', supHits='', vis='';
    if(opts.onUnit) unitHit=rc(a0-3,p.aMax+3,c-58,c+72,'rx="10" fill="transparent" style="cursor:pointer" onclick="'+opts.onUnit+'('+i+')"');
    vis+=ln(a0+2,c,p.aMax-2,c,'#9a988f',2.6);
    LL.mach.forEach(function(mm){ var t=MT[mm.m.type]||MT.motor, col=t.color, h=mm.wrap?50:40, am0=a0+mm.a0, am1=a0+mm.a1, oa=a0+mm.organA;
      vis+=rc(am0,am1,c-h,c+h,'rx="9" fill="'+col+'" fill-opacity="0.07" stroke="'+col+'" stroke-width="1.6"');
      vis+=rc(oa-mm.organW/2,oa+mm.organW/2,c-21,c+21,'rx="4" fill="'+col+'" fill-opacity="0.30" stroke="'+col+'" stroke-width="1.2"');
      var lm=(am0+am1)/2;
      if(O==='h') vis+=tx(lm,c+h+13,t.name,'#b4b2a9',10.5);
      else vis+=tx(lm,c+h+10,t.name,'#b4b2a9',10.5,'start');
    });
    var ns=(u.supports||[]).length, s0=a0+LL.s0, s1=a0+LL.s1;
    for(var k=0;k<ns;k++){
      var ab=(ns===1)?(s0+s1)/2 : s0+(s1-s0)*k/(ns-1);
      var num=supNum(units,i,k);
      var warn=opts.brgWarn && !((u.supports[k].brgs||[]).some(function(b){return b;}));
      var tickCol=warn?'#ef9f27':'#cfcdc4';
      vis+=ln(ab,c-23,ab,c-10,tickCol,3)+ln(ab,c+10,ab,c+23,tickCol,3);
      var st=opts.supStates?opts.supStates[num-1]:null;
      var fill=st?ZC[st]:'#2a2a27', tcol=st?'#141413':'#b4b2a9', ring=warn?'#ef9f27':'rgba(255,255,255,0.28)';
      if(opts.activeSup===num) vis+=cir(ab,c+37,14.5,'fill="none" stroke="#85b7eb" stroke-width="1.6"');
      vis+=cir(ab,c+37,10.5,'fill="'+fill+'" stroke="'+ring+'" stroke-width="1"');
      vis+=tx(ab,c+37.5,String(num),tcol,10.5);
      if(opts.onSup) supHits+=rc(ab-17,ab+17,c-26,c+52,'fill="transparent" style="cursor:pointer" onclick="'+opts.onSup+'('+i+','+k+')"');
      if(out) out.sups.push({i:i,k:k,num:num,a:ab,c:c});
    }
    var selO=(opts.sel===i)?rc(a0-3,p.aMax+3,c-58,c+72,'rx="10" fill="none" stroke="#85b7eb" stroke-width="1.3"'):'';
    return unitHit+'<g pointer-events="none">'+vis+selO+'</g>'+supHits;
  }

  function drawConn(p,i,trans,opts){
    var T=trans[i-1]||{type:'elastic'}, c=p.c, vis='', hit='';
    if(p.coup){ var ca=p.ca;
      vis+=ln(ca-17,c,ca+17,c,'#9a988f',2.6);
      vis+=rc(ca-14,ca-8,c-8,c+8,'rx="1" fill="#55534c"')+rc(ca+8,ca+14,c-8,c+8,'rx="1" fill="#55534c"');
      vis+=rc(ca-8,ca-2.5,c-13,c+13,'rx="1.5" fill="#6e6c64"')+rc(ca+2.5,ca+8,c-13,c+13,'rx="1.5" fill="#6e6c64"');
      if(T.type==='elastic') vis+=rc(ca-1.4,ca+1.4,c-10,c+10,'rx="1.2" fill="#ef9f27" opacity="0.85"');
      if(opts.onLink) hit=rc(ca-18,ca+18,c-18,c+18,'fill="transparent" style="cursor:pointer" onclick="'+opts.onLink+'('+(i-1)+')"');
    }
    else if(p.belt){ var ba=p.beltA, c1=p.c1, c2=p.c2, r1=13, r2=9;
      if(T.type==='gear'){
        vis+=ln(ba,c1,ba,c2,'#6e6c64',1.6);
        vis+=cir(ba,c1,14,'fill="#1f1f1d" stroke="#8f8d84" stroke-width="2" stroke-dasharray="3.5 2.6"')+cir(ba,c1,3,'fill="#55534c"');
        vis+=cir(ba,c2,10,'fill="#1f1f1d" stroke="#8f8d84" stroke-width="2" stroke-dasharray="3.5 2.6"')+cir(ba,c2,3,'fill="#55534c"');
      } else {
        vis+=ln(ba-r1+2,c1,ba-r2+1,c2,'#86857e',2)+ln(ba+r1-2,c1,ba+r2-1,c2,'#86857e',2);
        vis+=cir(ba,c1,r1,'fill="#1f1f1d" stroke="#8f8d84" stroke-width="2.2"')+cir(ba,c1,3,'fill="#55534c"');
        vis+=cir(ba,c2,r2,'fill="#1f1f1d" stroke="#8f8d84" stroke-width="2.2"')+cir(ba,c2,3,'fill="#55534c"');
      }
      if(opts.onLink) hit=rc(ba-18,ba+18,Math.min(c1,c2)-16,Math.max(c1,c2)+16,'fill="transparent" style="cursor:pointer" onclick="'+opts.onLink+'('+(i-1)+')"');
    }
    return '<g pointer-events="none">'+vis+'</g>'+hit;
  }

  function render(el,agg,opts){
    opts=opts||{};
    O=(agg&&agg.orient==='v')?'v':'h';
    var units=(agg&&agg.units)||[], trans=(agg&&agg.trans)||[];
    var out={sups:[]};
    if(!units.length){ el.innerHTML='<svg width="100%" height="110"></svg>'; return out; }
    var P=layout(units,trans), s='';
    P.forEach(function(p,i){ if(i>0) s+=drawConn(p,i,trans,opts); s+=drawUnitFull(units,units[i],p,i,opts,out); });
    var aLo=1e9,aHi=-1e9,cLo=1e9,cHi=-1e9;
    P.forEach(function(p){ aLo=Math.min(aLo,p.aMin); aHi=Math.max(aHi,p.aMax); cLo=Math.min(cLo,p.c); cHi=Math.max(cHi,p.c); });
    var pad=8, minX,minY,W,H;
    if(O==='h'){ minX=aLo-pad; minY=cLo-58-pad; W=(aHi+pad)-minX; H=(cHi+78+pad)-minY; }
    else { minX=cLo-58-pad; minY=aLo-pad; W=(cHi+118+pad)-minX; H=(aHi+pad)-minY; }
    var attrs=(opts.fit && W<=560) ? 'width="100%"' : 'width="'+Math.max(W,300)+'" height="'+H+'"';
    el.innerHTML='<svg '+attrs+' viewBox="'+minX+' '+minY+' '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
    return out;
  }

  return { render:render, MT:MT, supNum:supNum };
})();
