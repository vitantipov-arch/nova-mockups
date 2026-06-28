const fs=require('fs');
const src=[...fs.readFileSync('ui_mockups/journal.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
function mkDoc(){ const el=()=>({innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},value:'',setAttribute(){},onclick:null}); return {getElementById:()=>el(),querySelector:()=>el(),querySelectorAll:()=>[]}; }
function L(store){ return {getItem:k=>store[k]!==undefined?store[k]:null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}; }
function ch(s,ax,dir,qs){ var vals={}; qs.forEach(function(q){ vals[q]={rms:2+Math.random()*3,unit:(s==='g'?(q==='acc'?'°/с²':'°/с'):(q==='acc'?'м/с²':'мм/с')),comps:[{n:'1×',f:49,a:2}],ecomps:[{n:'BPFO',f:340,a:.5}]}; }); return {s,ax,dir,vals,amp1:2,phase:90}; }
function opora(sup){ return [
  {dir:'В',sup,zone:'g',rms:3,data:{channels:[ch('a','Z','В',['vel','acc']),ch('a','X','О',['vel','acc']),ch('a','Y','П',['vel','acc']),ch('g','Z','В',['vel','acc']),ch('g','X','О',['vel','acc']),ch('g','Y','П',['vel','acc'])]}},
  {dir:'П',sup,zone:'g',rms:2,data:{channels:[ch('a','Z','П',['vel','acc'])]}},
  {dir:'О',sup,zone:'g',rms:2,data:{channels:[ch('a','Z','О',['vel','acc'])]}}
];}
var pts=[]; [1,2,3,4].forEach(function(s){ pts=pts.concat(opora(s)); });
const store={ nova_sessions: JSON.stringify([{agg:'Тест2',aggId:1,date:'28.06',operator:'Т',count:12,total:12,points:pts}]) };
const fn=new Function('document','localStorage','location','console','var TEST_RESULT;'+src+"\nvar P=getSess()[0].points;var TABS=tabsFor(P),sups=supsFor(P),dirs=dirsFor(P);var rep={tabs:TABS.map(function(t){return t.l;}),sups:sups,dirs:dirs,grid:{}};TABS.forEach(function(t){var g={};dirs.forEach(function(d){var row=[];sups.forEach(function(s){row.push(cellOf(P,t,d,s)?'X':'·');});g[d]=row.join(' ');});rep.grid[t.l]=g;});TEST_RESULT=rep;return TEST_RESULT;");
const r=fn(mkDoc(),L(store),{search:'',href:''},console);
console.log('Вкладки:',r.tabs.join(' | '));
console.log('Опоры:',r.sups.join(' '),' Направления:',r.dirs.join(' '));
Object.keys(r.grid).forEach(function(tab){ console.log('\n['+tab+']  (X=есть ·=пусто, столбцы=опоры '+r.sups.join('')+')'); ['В','П','О'].forEach(function(d){ if(r.grid[tab][d]) console.log('  '+d+': '+r.grid[tab][d]); }); });
