(function(){
'use strict';

var CATS=[
  {id:'technology',name:'Technology',cls:'c-tech',blurb:'Tools, software and the machines we live with.'},
  {id:'lifestyle',name:'Lifestyle',cls:'c-life',blurb:'Home, health, habits and everyday craft.'},
  {id:'business',name:'Business',cls:'c-biz',blurb:'Work, money and building things that last.'},
  {id:'travel',name:'Travel',cls:'c-trv',blurb:'Places, routes and the trips worth planning.'}
];
var SAMPLE_BIO='Example post that shows how Fieldnote looks. Delete it whenever you like.';
var SAMPLE_POSTS=[
  {id:'seed-offline-first',title:'Why offline-first apps feel faster',category:'technology',author:'Sample Author',bio:SAMPLE_BIO,sample:true,createdAt:1791446400000,updatedAt:1791446400000,excerpt:'',
   html:'<p>Most apps wait for the network before they show you anything. Offline-first apps do the opposite: they draw from a local copy right away and sync in the background. The speed you notice is the absence of a spinner.</p><h2>What changes for the user</h2><p>Typing a note, ticking a task or sending a draft all complete instantly. The sync happens later, and conflicts are settled by rules the team chose in advance instead of by a loading bar.</p><h2>What changes for the team</h2><ul><li>Data lives in two places, so every write needs a clear owner.</li><li>Conflicts need a policy: last write wins, or merge by field.</li><li>Tests must cover the airplane-mode case, not just the happy path.</li></ul><p>The extra work pays off on trains, in lifts and in every café with weak Wi-Fi.</p>'},
  {id:'seed-slow-mornings',title:'A slow morning routine that fits in forty minutes',category:'lifestyle',author:'Sample Author',bio:SAMPLE_BIO,sample:true,createdAt:1791282600000,updatedAt:1791282600000,excerpt:'',
   html:'<p>A good morning does not need a five o\u2019clock alarm. It needs a few fixed points that you never have to decide about.</p><h2>The fixed points</h2><ol><li>Water and a window, before any screen.</li><li>Ten minutes of movement. A walk counts.</li><li>One page of something you chose to read.</li></ol><blockquote><p>The goal is not a perfect routine. It is a morning that starts without negotiation.</p></blockquote><p>Keep the order the same for two weeks before you change anything. Most routines fail because they were redesigned every few days.</p>'},
  {id:'seed-pricing-small-teams',title:'Pricing for a team of five',category:'business',author:'Sample Author',bio:SAMPLE_BIO,sample:true,createdAt:1791008100000,updatedAt:1791008100000,excerpt:'',
   html:'<p>Small teams often price by guessing what a competitor charges. A better start is to work backwards from what one customer needs to pay for the business to stay healthy.</p><h2>Start with the floor</h2><p>Add up monthly costs, including the salaries you wish you were paying yourselves, and divide by the number of customers you can serve well. That number is the floor, not the price.</p><h2>Then test upward</h2><p>Raise the price for every new customer until you hear a real objection. Most teams find the objection arrives later than they feared.</p>'},
  {id:'seed-shoulder-season',title:'The case for travelling in shoulder season',category:'travel',author:'Sample Author',bio:SAMPLE_BIO,sample:true,createdAt:1790596800000,updatedAt:1790596800000,excerpt:'',
   html:'<p>Shoulder season sits between the crowds and the quiet. Prices drop, queues shorten and locals have time to talk.</p><h2>What to plan around</h2><ul><li>Check opening hours. Some places close between peak periods.</li><li>Book the first and last nights and leave the middle open.</li><li>Pack for two kinds of weather.</li></ul><p>The trade is a little less certainty for a lot more space. Most travellers who try it do not go back to peak dates.</p>'}
];

var S={posts:[],comments:[],ready:false,mode:null,db:null,user:null,myId:null,isAdmin:false,canWrite:true,q:'',route:{name:'home'},renderKey:'',editorMounted:false,savedRange:null};
var app=document.getElementById('app');
var qInput=document.getElementById('q');

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function catById(id){return CATS.filter(function(c){return c.id===id})[0]||null;}
function initials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0)}).join('').toUpperCase()||'?';}
function fmtDate(ts){try{return new Date(ts).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}catch(e){return '';}}
function byId(id){return S.posts.filter(function(p){return p.id===id})[0]||null;}
function newId(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function store(k,v){try{if(v===undefined){return localStorage.getItem(k);}if(v===null){localStorage.removeItem(k);}else{localStorage.setItem(k,v);}}catch(e){}return null;}

/* ---------- sanitising and text helpers ---------- */
var ALLOWED={P:1,BR:1,H2:1,H3:1,H4:1,STRONG:1,B:1,EM:1,I:1,U:1,S:1,BLOCKQUOTE:1,UL:1,OL:1,LI:1,A:1,CODE:1,PRE:1,HR:1,DIV:1,SPAN:1};
var DROP={SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,TEMPLATE:1,NOSCRIPT:1,SVG:1,MATH:1};
function clean(html){
  var doc=new DOMParser().parseFromString('<body>'+String(html||'')+'</body>','text/html');
  var out=document.createElement('div');
  function walk(src,dst){
    Array.prototype.forEach.call(src.childNodes,function(n){
      if(n.nodeType===3){dst.appendChild(document.createTextNode(n.nodeValue));return;}
      if(n.nodeType!==1)return;
      var tag=n.tagName.toUpperCase();
      if(DROP[tag])return;
      if(!ALLOWED[tag]||tag==='SPAN'){walk(n,dst);return;}
      var t=tag==='B'?'strong':tag==='I'?'em':tag==='DIV'?'p':tag.toLowerCase();
      var el=document.createElement(t);
      if(t==='a'){
        var h=(n.getAttribute('href')||'').trim();
        if(!/^https?:\/\//i.test(h)){walk(n,dst);return;}
        el.setAttribute('href',h);el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer nofollow');
      }
      walk(n,el);dst.appendChild(el);
    });
  }
  walk(doc.body,out);
  return out.innerHTML;
}
var textCache={};
function plain(html){
  var s=String(html||'').replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi,' ').replace(/<br\s*\/?>/gi,' ');
  var d=new DOMParser().parseFromString(s,'text/html');
  return (d.body.textContent||'').replace(/\s+/g,' ').trim();
}
function textOf(p){
  var k=p.id+':'+(p.updatedAt||0);
  if(textCache[k]===undefined)textCache[k]=plain(p.html);
  return textCache[k];
}
function excerptOf(p){
  if(p.excerpt&&p.excerpt.trim())return p.excerpt.trim();
  var t=textOf(p);
  return t.length>180?t.slice(0,177).replace(/\s+\S*$/,'')+'\u2026':t;
}
function readTime(p){var w=textOf(p).split(' ').filter(Boolean).length;return Math.max(1,Math.round(w/220))+' min read';}

/* ---------- storage: shared db when granted, local fallback otherwise ---------- */
function lsLoad(){var raw=store('fieldnote.local.v1');if(!raw)return null;try{return JSON.parse(raw);}catch(e){return null;}}
function lsSave(){store('fieldnote.local.v1',JSON.stringify({posts:S.posts,comments:S.comments}));}
function sortPosts(){S.posts.sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});}
function useLocal(){
  if(S.mode==='shared'||S.ready)return;
  S.mode='local';S.canWrite=true;S.isAdmin=true;
  var d=lsLoad();
  if(d&&d.posts){S.posts=d.posts;S.comments=d.comments||[];}
  else{S.posts=SAMPLE_POSTS.map(function(p){return Object.assign({},p);});S.comments=[];}
  sortPosts();S.ready=true;render();syncChrome();
}
async function initShared(){
  var db=null;
  if(!(window.claude&&window.claude.use)){useLocal();return;}
  try{db=await window.claude.use('db');}catch(e){db=null;}
  if(!db){useLocal();return;}
  var user=null;
  try{user=await window.claude.use('user');}catch(e){user=null;}
  S.mode='shared';S.db=db;S.user=user;
  if(user){
    try{S.myId=await user.id();}catch(e){}
    try{S.isAdmin=!!(await user.canEdit())||!!(await user.isOwner());}catch(e){}
    try{var w=await user.can('data.write');S.canWrite=(w!==false);}catch(e){}
  }
  S.posts=[];S.comments=[];S.ready=false;
  var gotPosts=false;
  db.collection('posts').orderBy('createdAt','desc').limit(500).onSnapshot(function(snap){
    S.posts=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    gotPosts=true;S.ready=true;onData();
  },function(){if(!gotPosts){S.ready=true;onData();}});
  db.collection('comments').orderBy('createdAt','asc').limit(1000).onSnapshot(function(snap){
    S.comments=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    if(S.ready)onData();
  },function(){});
}
function onData(){
  syncChrome();
  if(S.editorMounted)return;
  render();
}
function errMsg(e){
  var c=e&&e.code;
  if(c==='invalid_argument')return 'You need contributor access to change this blog.';
  if(c==='quota_exceeded')return 'This blog is full. Delete a post or comment first.';
  if(c==='resource_exhausted')return 'Too many requests. Wait a moment and try again.';
  return 'Could not save. Check your connection and try again.';
}
async function savePost(p){
  var data=Object.assign({},p);var id=data.id;delete data.id;
  if(S.mode==='shared'){
    var col=S.db.collection('posts');var ref=id?col.doc(id):col.doc();
    await ref.set(data);
    if(!byId(ref.id)){S.posts=S.posts.concat([Object.assign({id:ref.id},data)]);sortPosts();}
    return ref.id;
  }
  id=id||newId();data.id=id;
  S.posts=S.posts.filter(function(x){return x.id!==id}).concat([data]);sortPosts();lsSave();return id;
}
async function removePost(id){
  var theirs=S.comments.filter(function(c){return c.postId===id});
  if(S.mode==='shared'){
    for(var i=0;i<theirs.length;i++){await S.db.collection('comments').doc(theirs[i].id).delete();}
    await S.db.collection('posts').doc(id).delete();return;
  }
  S.posts=S.posts.filter(function(x){return x.id!==id});
  S.comments=S.comments.filter(function(c){return c.postId!==id});lsSave();
}
async function saveComment(c){
  if(S.mode==='shared'){await S.db.collection('comments').doc().set(c);return;}
  c.id=newId();S.comments=S.comments.concat([c]);lsSave();
}
async function removeComment(id){
  if(S.mode==='shared'){await S.db.collection('comments').doc(id).delete();return;}
  S.comments=S.comments.filter(function(c){return c.id!==id});lsSave();
}
function canManage(p){return S.mode==='local'||S.isAdmin||!!(p.authorId&&S.myId&&p.authorId===S.myId);}
function canDeleteComment(c,p){return S.mode==='local'||S.isAdmin||!!(c.authorId&&S.myId&&c.authorId===S.myId)||(p&&canManage(p));}

/* ---------- routing ---------- */
function parseRoute(h){
  h=String(h||'').replace(/^#/,'');
  if(h.indexOf('post-')===0)return {name:'post',id:h.slice(5)};
  if(h.indexOf('edit-')===0)return {name:'edit',id:h.slice(5)};
  if(h.indexOf('cat-')===0)return {name:'cat',id:h.slice(4)};
  if(h==='write')return {name:'write'};
  return {name:'home'};
}
function routeKey(r){return r.name+':'+(r.id||'');}
function go(h){
  var r=parseRoute(h);
  if(S.editorMounted&&routeKey(r)===routeKey(S.route))return;
  S.route=r;
  try{if(location.hash!=='#'+h)location.hash=h;}catch(e){}
  render();syncChrome();
  try{window.scrollTo(0,0);}catch(e){}
}
window.addEventListener('hashchange',function(){
  var r=parseRoute(location.hash);
  if(routeKey(r)!==routeKey(S.route)){S.route=r;render();syncChrome();try{window.scrollTo(0,0);}catch(e){}}
});

/* ---------- views ---------- */
function chip(id){var c=catById(id);if(!c)return '';return '<a class="chip '+c.cls+'" href="#cat-'+c.id+'" data-go>'+esc(c.name)+'</a>';}
function sampleTag(p){return p.sample?'<span class="sample-tag">Sample</span>':'';}
function metaLine(p){return '<div class="meta"><strong>'+esc(p.author||'Anonymous')+'</strong><span aria-hidden="true">\u00b7</span><span>'+esc(readTime(p))+'</span></div>';}
function rowHtml(p){
  return '<article class="row"><div class="row-top">'+chip(p.category)+'<time>'+esc(fmtDate(p.createdAt))+'</time>'+sampleTag(p)+'</div>'+
    '<h2><a href="#post-'+esc(p.id)+'" data-go>'+esc(p.title)+'</a></h2><p class="ex">'+esc(excerptOf(p))+'</p>'+metaLine(p)+'</article>';
}
function leadHtml(p){
  return '<article class="lead"><div class="row-top">'+chip(p.category)+'<time>'+esc(fmtDate(p.createdAt))+'</time>'+sampleTag(p)+'</div>'+
    '<h2><a href="#post-'+esc(p.id)+'" data-go>'+esc(p.title)+'</a></h2><p class="ex">'+esc(excerptOf(p))+'</p>'+metaLine(p)+'</article>';
}
function writeCta(){return S.canWrite?'<a class="btn primary" href="#write" data-go>Write a post</a>':'';}
function modeNote(){
  return S.mode==='shared'?'Posts and comments are shared with everyone who can open this page.':'Posts and comments are saved in this browser only.';
}
function sidebar(){
  var items=CATS.map(function(c){
    var n=S.posts.filter(function(p){return p.category===c.id}).length;
    return '<li><a href="#cat-'+c.id+'" data-go><span class="dot '+c.cls+'"></span>'+esc(c.name)+'<span class="n">'+n+'</span></a></li>';
  }).join('');
  return '<aside class="side"><section class="panel"><h2>Categories</h2><ul class="cat-list">'+items+'</ul></section>'+
    (S.canWrite?'<section class="panel"><h2>Your turn</h2><p>Write a post with headings, lists, quotes and links.</p>'+writeCta()+'</section>':'')+
    '<p class="mode-note">'+esc(modeNote())+'</p></aside>';
}
function filtered(r){
  var l=S.posts.slice();
  if(r.name==='cat')l=l.filter(function(p){return p.category===r.id});
  var q=S.q.trim().toLowerCase();
  if(q)l=l.filter(function(p){
    var c=catById(p.category);
    return (p.title+' '+(p.excerpt||'')+' '+(p.author||'')+' '+(c?c.name:'')+' '+textOf(p)).toLowerCase().indexOf(q)>-1;
  });
  return l;
}
function notFound(msg){
  return '<div class="empty"><h2>Not found</h2><p>'+esc(msg)+'</p><a class="btn" href="#home" data-go>Back to all posts</a></div>';
}
function homeView(r){
  var cat=r.name==='cat'?catById(r.id):null;
  if(r.name==='cat'&&!cat)return notFound('That category does not exist.');
  var list=filtered(r),q=S.q.trim(),head='',body='';
  if(cat)head='<header class="page-head"><span class="chip '+cat.cls+'">'+esc(cat.name)+'</span><h1>'+esc(cat.name)+'</h1><p>'+esc(cat.blurb)+'</p></header>';
  else if(q)head='<header class="page-head"><h1>Search results</h1></header>';
  else head='<p class="eyebrow">Latest posts</p>';
  if(q)head+='<p class="result-note">'+list.length+(list.length===1?' result':' results')+' for \u201c'+esc(q)+'\u201d. <button type="button" class="link" data-action="clear-search">Clear search</button></p>';
  if(!list.length){
    if(q)body='<div class="empty"><h2>No matches</h2><p>Nothing matches \u201c'+esc(q)+'\u201d. Try a different word or browse a category.</p></div>';
    else if(cat)body='<div class="empty"><h2>Nothing in '+esc(cat.name)+' yet</h2><p>Posts you publish in this category will show up here.</p>'+writeCta()+'</div>';
    else body='<div class="empty"><h2>No posts yet</h2><p>Publish the first post and it will appear here.</p>'+writeCta()+'</div>';
  }else if(!cat&&!q){
    body=leadHtml(list[0])+list.slice(1).map(rowHtml).join('');
  }else body=list.map(rowHtml).join('');
  return '<div class="home"><div class="feed">'+head+body+'</div>'+sidebar()+'</div>';
}
function commentsHtml(p){
  var list=S.comments.filter(function(c){return c.postId===p.id});
  var form;
  if(S.canWrite){
    form='<form class="c-form" id="comment-form"><div class="field"><label for="c-name">Name</label><input id="c-name" maxlength="60" autocomplete="name" value="'+esc(store('fieldnote.name')||'')+'"></div>'+
      '<div class="field"><label for="c-body">Comment</label><textarea id="c-body" maxlength="1500" placeholder="Share a thought or ask a question"></textarea></div>'+
      '<p class="err" id="c-error" role="alert" hidden></p><div><button class="btn primary" type="submit" id="c-send">Post comment</button></div></form>';
  }else form='<p class="note">You can read comments here. Ask the owner for contributor access to join in.</p>';
  var items=list.map(function(c){
    return '<li class="c"><span class="av sm" aria-hidden="true">'+esc(initials(c.name))+'</span><div class="c-main"><div class="c-head"><strong>'+esc(c.name||'Anonymous')+'</strong><time>'+esc(fmtDate(c.createdAt))+'</time>'+
      (canDeleteComment(c,p)?'<button type="button" class="link" data-action="del-comment" data-id="'+esc(c.id)+'" data-confirm="1">Delete</button>':'')+
      '</div><p>'+esc(c.body)+'</p></div></li>';
  }).join('');
  return '<section class="comments" id="comments"><h2>'+list.length+(list.length===1?' comment':' comments')+'</h2>'+form+(items?'<ol class="c-list">'+items+'</ol>':'<p class="note">No comments yet. Start the conversation.</p>')+'</section>';
}
function postView(id){
  var p=byId(id);
  if(!p)return notFound('This post may have been deleted.');
  var rel=S.posts.filter(function(x){return x.id!==p.id&&x.category===p.category}).slice(0,3);
  if(rel.length<3)rel=rel.concat(S.posts.filter(function(x){return x.id!==p.id&&x.category!==p.category}).slice(0,3-rel.length));
  var relHtml=rel.length?'<h2 class="section-h">Related posts</h2><div class="related">'+rel.map(function(x){
    var c=catById(x.category);
    return '<a class="rel" href="#post-'+esc(x.id)+'" data-go>'+(c?'<span class="chip '+c.cls+'">'+esc(c.name)+'</span>':'')+'<strong>'+esc(x.title)+'</strong><span class="m">'+esc(x.author||'Anonymous')+' \u00b7 '+esc(readTime(x))+'</span></a>';
  }).join('')+'</div>':'';
  var manage=canManage(p)?'<div class="manage"><a class="btn small" href="#edit-'+esc(p.id)+'" data-go>Edit</a><button type="button" class="btn small danger" data-action="del-post" data-id="'+esc(p.id)+'" data-confirm="1">Delete</button></div>':'';
  var updated=(p.updatedAt&&p.createdAt&&p.updatedAt-p.createdAt>60000)?' \u00b7 Updated '+esc(fmtDate(p.updatedAt)):'';
  var cat=catById(p.category);
  return '<article class="article"><a class="back" href="'+(cat?'#cat-'+cat.id:'#home')+'" data-go>\u2190 '+(cat?esc(cat.name):'All posts')+'</a>'+
    '<div class="kicker">'+chip(p.category)+'<span>'+esc(readTime(p))+'</span>'+sampleTag(p)+'</div>'+
    '<h1>'+esc(p.title)+'</h1>'+
    '<div class="byline"><span class="av" aria-hidden="true">'+esc(initials(p.author))+'</span><div class="who"><strong>'+esc(p.author||'Anonymous')+'</strong><span>Published '+esc(fmtDate(p.createdAt))+updated+'</span></div>'+manage+'</div>'+
    '<div class="prose">'+clean(p.html)+'</div>'+
    '<aside class="author-box"><span class="av" aria-hidden="true">'+esc(initials(p.author))+'</span><div><h2>Written by</h2><strong>'+esc(p.author||'Anonymous')+'</strong>'+(p.bio?'<p>'+esc(p.bio)+'</p>':'')+'</div></aside>'+
    relHtml+commentsHtml(p)+'</article>';
}
function loadDraft(){var raw=store('fieldnote.draft.v1');if(!raw)return null;try{return JSON.parse(raw);}catch(e){return null;}}
function editorView(r){
  if(!S.canWrite)return notFound('You have read-only access, so you cannot write posts here.');
  var post=r.name==='edit'?byId(r.id):null;
  if(r.name==='edit'&&!post)return notFound('This post may have been deleted.');
  if(post&&!canManage(post))return notFound('Only the author can edit this post.');
  var d=post?null:loadDraft();
  var init={
    title:post?post.title:(d&&d.title)||'',
    category:post?post.category:(d&&d.category)||CATS[0].id,
    author:post?post.author:store('fieldnote.name')||'',
    bio:post?(post.bio||''):store('fieldnote.bio')||'',
    excerpt:post?(post.excerpt||''):(d&&d.ex)||''
  };
  var opts=CATS.map(function(c){return '<option value="'+c.id+'"'+(c.id===init.category?' selected':'')+'>'+esc(c.name)+'</option>';}).join('');
  function tb(cmd,label,title,extra){return '<button type="button" data-cmd="'+cmd+'" title="'+title+'" aria-label="'+title+'"'+(extra||'')+'>'+label+'</button>';}
  return '<section class="editor"><p class="ed-h">'+(post?'Edit post':'New post')+'</p>'+
    '<div><label class="sr" for="e-title">Title</label><input class="e-title" id="e-title" maxlength="140" placeholder="Post title" value="'+esc(init.title)+'"></div>'+
    '<div class="e-meta"><div class="field"><label for="e-cat">Category</label><select id="e-cat">'+opts+'</select></div>'+
    '<div class="field"><label for="e-author">Your name</label><input id="e-author" maxlength="60" autocomplete="name" value="'+esc(init.author)+'"></div></div>'+
    '<div class="field"><label for="e-bio">About you <span>shown under the post</span></label><input id="e-bio" maxlength="160" value="'+esc(init.bio)+'"></div>'+
    '<div><div class="toolbar" role="toolbar" aria-label="Formatting">'+
      tb('bold','<b>B</b>','Bold',' aria-pressed="false"')+tb('italic','<i>I</i>','Italic',' aria-pressed="false"')+tb('underline','<u>U</u>','Underline',' aria-pressed="false"')+'<span class="sep"></span>'+
      tb('h2','H2','Heading')+tb('h3','H3','Subheading')+tb('quote','\u201c','Quote')+'<span class="sep"></span>'+
      tb('ul','\u2022 List','Bulleted list')+tb('ol','1. List','Numbered list')+tb('link','Link','Add link')+tb('clear','Clear','Clear formatting')+
    '</div><div class="link-pop" id="link-pop" hidden><label class="sr" for="e-url">Link address</label><input id="e-url" type="url" placeholder="https://example.com"><button type="button" class="btn small primary" data-action="link-apply">Add link</button><button type="button" class="btn small" data-action="link-cancel">Cancel</button></div>'+
    '<div id="e-body" class="rte prose" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Post body" data-placeholder="Start writing here. Select text to format it."></div></div>'+
    '<div class="field"><label for="e-ex">Summary <span>optional, shown on the homepage</span></label><textarea id="e-ex" rows="2" maxlength="220">'+esc(init.excerpt)+'</textarea></div>'+
    '<p class="err" id="e-error" role="alert" hidden></p>'+
    '<div class="e-actions"><button type="button" class="btn primary" id="e-publish" data-action="publish">'+(post?'Save changes':'Publish')+'</button><a class="btn" href="'+(post?'#post-'+esc(post.id):'#home')+'" data-go>Cancel</a><span class="wc" id="e-count">0 words</span></div></section>';
}

/* ---------- render ---------- */
function captureForm(){
  var ae=document.activeElement,vals={};
  app.querySelectorAll('input[id],textarea[id],select[id]').forEach(function(el){vals[el.id]=el.value;});
  return {vals:vals,focus:(ae&&app.contains(ae)&&ae.id)?ae.id:null,sel:(ae&&ae.selectionStart!=null)?[ae.selectionStart,ae.selectionEnd]:null};
}
function restoreForm(c){
  Object.keys(c.vals).forEach(function(id){var el=document.getElementById(id);if(el&&el.value!==c.vals[id])el.value=c.vals[id];});
  if(c.focus){var f=document.getElementById(c.focus);if(f){f.focus();try{if(c.sel)f.setSelectionRange(c.sel[0],c.sel[1]);}catch(e){}}}
}
function render(){
  var r=S.route,key=routeKey(r);
  var snap=(key===S.renderKey&&!S.editorMounted)?captureForm():null;
  var html;
  S.editorMounted=false;
  if(!S.ready)html='<p class="loading">Loading posts\u2026</p>';
  else if(r.name==='home'||r.name==='cat')html=homeView(r);
  else if(r.name==='post')html=postView(r.id);
  else html=editorView(r);
  app.innerHTML=html;
  S.renderKey=key;
  if(S.ready&&(r.name==='write'||r.name==='edit')&&document.getElementById('e-body'))mountEditor(r);
  else if(snap)restoreForm(snap);
  document.getElementById('foot').textContent='Fieldnote \u00b7 '+modeNote();
}
function syncChrome(){
  var r=S.route,nav=document.getElementById('cats');
  var cur=r.name==='cat'?r.id:(r.name==='home'?'all':(r.name==='post'&&byId(r.id)?byId(r.id).category:''));
  var items=['<a class="pill" href="#home" data-go'+(cur==='all'?' aria-current="page"':'')+'>All</a>'].concat(CATS.map(function(c){
    return '<a class="pill" href="#cat-'+c.id+'" data-go'+(cur===c.id?' aria-current="page"':'')+'>'+esc(c.name)+'</a>';
  }));
  var html=items.join('');
  if(nav.getAttribute('data-sig')!==html){nav.innerHTML=html;nav.setAttribute('data-sig',html);}
  if(document.activeElement!==qInput&&qInput.value!==S.q)qInput.value=S.q;
  document.getElementById('write-btn').hidden=!S.canWrite;
}

/* ---------- editor ---------- */
var draftTimer=null;
function editorEl(){return document.getElementById('e-body');}
function wordCount(){var ed=editorEl();if(!ed)return 0;return (ed.innerText||'').trim().split(/\s+/).filter(Boolean).length;}
function updateCount(){var c=document.getElementById('e-count');if(c){var n=wordCount();c.textContent=n+(n===1?' word':' words');}}
function scheduleDraft(){
  if(S.route.name!=='write')return;
  clearTimeout(draftTimer);
  draftTimer=setTimeout(function(){
    var ed=editorEl();if(!ed||S.route.name!=='write')return;
    store('fieldnote.draft.v1',JSON.stringify({title:document.getElementById('e-title').value,category:document.getElementById('e-cat').value,ex:document.getElementById('e-ex').value,html:ed.innerHTML}));
  },600);
}
function mountEditor(r){
  S.editorMounted=true;
  var ed=editorEl(),post=r.name==='edit'?byId(r.id):null,d=post?null:loadDraft();
  ed.innerHTML=clean(post?post.html:(d&&d.html)||'');
  ed.addEventListener('focus',function(){try{document.execCommand('defaultParagraphSeparator',false,'p');}catch(e){}});
  ed.addEventListener('input',function(){
    if(ed.innerHTML==='<br>'||ed.innerHTML==='<p><br></p>')ed.innerHTML='';
    updateCount();scheduleDraft();
  });
  ed.addEventListener('paste',function(e){
    e.preventDefault();
    var t=(e.clipboardData||window.clipboardData).getData('text/plain');
    try{document.execCommand('insertText',false,t);}catch(err){}
  });
  ['e-title','e-cat','e-ex'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',scheduleDraft);});
  document.getElementById('e-url').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();applyLink();}});
  updateCount();
}
function syncToolbar(){
  if(!S.editorMounted)return;
  ['bold','italic','underline'].forEach(function(c){
    var b=document.querySelector('.toolbar [data-cmd="'+c+'"]');if(!b)return;
    var on=false;try{on=document.queryCommandState(c);}catch(e){}
    b.setAttribute('aria-pressed',on?'true':'false');
  });
}
document.addEventListener('selectionchange',syncToolbar);
function fmt(cmd){
  var ed=editorEl();if(!ed)return;
  if(document.activeElement!==ed)ed.focus();
  try{
    if(cmd==='h2'||cmd==='h3'||cmd==='quote'){
      var tag=cmd==='quote'?'blockquote':cmd;
      var cur=(document.queryCommandValue('formatBlock')||'').toLowerCase().replace(/[<>]/g,'');
      document.execCommand('formatBlock',false,'<'+(cur===tag?'p':tag)+'>');
    }else if(cmd==='ul')document.execCommand('insertUnorderedList');
    else if(cmd==='ol')document.execCommand('insertOrderedList');
    else if(cmd==='clear'){document.execCommand('removeFormat');document.execCommand('formatBlock',false,'<p>');}
    else document.execCommand(cmd);
  }catch(e){}
  syncToolbar();updateCount();scheduleDraft();
}
function openLink(){
  var ed=editorEl(),sel=window.getSelection();
  S.savedRange=(sel&&sel.rangeCount&&ed.contains(sel.anchorNode))?sel.getRangeAt(0).cloneRange():null;
  var pop=document.getElementById('link-pop');pop.hidden=false;
  var u=document.getElementById('e-url');u.value='';u.focus();
}
function closeLink(){var pop=document.getElementById('link-pop');if(pop)pop.hidden=true;}
function applyLink(){
  var u=document.getElementById('e-url'),v=u.value.trim(),ed=editorEl();
  if(!v)return;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(v))v='https://'+v;
  var ok=false;try{var url=new URL(v);ok=url.protocol==='http:'||url.protocol==='https:';}catch(e){}
  if(!ok){u.setCustomValidity('Enter a web address that starts with http or https.');u.reportValidity();u.setCustomValidity('');return;}
  ed.focus();
  var sel=window.getSelection();
  if(S.savedRange){sel.removeAllRanges();sel.addRange(S.savedRange);}
  try{
    if(sel.rangeCount&&sel.isCollapsed)document.execCommand('insertHTML',false,'<a href="'+esc(v)+'">'+esc(v)+'</a>');
    else document.execCommand('createLink',false,v);
  }catch(e){}
  closeLink();updateCount();scheduleDraft();
}
function showErr(id,msg){var el=document.getElementById(id);if(!el)return;el.textContent=msg;el.hidden=!msg;}
async function publish(){
  var r=S.route,ed=editorEl();if(!ed)return;
  var title=document.getElementById('e-title').value.trim();
  var html=clean(ed.innerHTML),text=plain(html);
  if(!title){showErr('e-error','Add a title before publishing.');document.getElementById('e-title').focus();return;}
  if(!text){showErr('e-error','Write something in the body before publishing.');ed.focus();return;}
  showErr('e-error','');
  var existing=r.name==='edit'?byId(r.id):null;
  var author=document.getElementById('e-author').value.trim()||'Anonymous';
  var bio=document.getElementById('e-bio').value.trim();
  var doc=Object.assign({},existing||{});
  delete doc.sample;
  Object.assign(doc,{
    title:title,html:html,excerpt:document.getElementById('e-ex').value.trim(),
    category:document.getElementById('e-cat').value,author:author,bio:bio,
    createdAt:(existing&&existing.createdAt)||Date.now(),updatedAt:Date.now()
  });
  if(!doc.authorId&&S.myId)doc.authorId=S.myId;
  var btn=document.getElementById('e-publish'),label=btn.textContent;
  btn.disabled=true;btn.textContent='Saving\u2026';
  try{
    var id=await savePost(doc);
    store('fieldnote.name',author);store('fieldnote.bio',bio);
    if(!existing)store('fieldnote.draft.v1',null);
    toast(existing?'Changes saved':'Published');
    S.editorMounted=false;
    go('post-'+id);
  }catch(e){
    showErr('e-error',errMsg(e));btn.disabled=false;btn.textContent=label;
  }
}

/* ---------- events ---------- */
var toastTimer=null;
function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},2600);}

document.addEventListener('mousedown',function(e){
  if(e.target.closest&&e.target.closest('.toolbar button'))e.preventDefault();
});
document.addEventListener('click',async function(e){
  var t=e.target;if(!t.closest)return;
  var a=t.closest('a[data-go]');
  if(a&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey){e.preventDefault();go(a.getAttribute('href').slice(1));return;}
  var cmdBtn=t.closest('.toolbar [data-cmd]');
  if(cmdBtn){var c=cmdBtn.getAttribute('data-cmd');if(c==='link')openLink();else fmt(c);return;}
  var btn=t.closest('[data-action]');if(!btn)return;
  if(btn.dataset.confirm&&btn.dataset.armed!=='1'){
    btn.dataset.armed='1';btn.dataset.label=btn.textContent;btn.textContent='Click again to confirm';
    setTimeout(function(){if(btn.isConnected){btn.dataset.armed='';btn.textContent=btn.dataset.label;}},3500);return;
  }
  var act=btn.dataset.action;
  if(act==='clear-search'){S.q='';qInput.value='';render();syncChrome();}
  else if(act==='link-apply')applyLink();
  else if(act==='link-cancel')closeLink();
  else if(act==='publish')publish();
  else if(act==='del-post'){
    btn.disabled=true;
    try{await removePost(btn.dataset.id);toast('Post deleted');go('home');}
    catch(err){btn.disabled=false;btn.textContent='Delete';btn.dataset.armed='';toast(errMsg(err));}
  }else if(act==='del-comment'){
    btn.disabled=true;
    try{await removeComment(btn.dataset.id);if(S.mode==='local')render();toast('Comment deleted');}
    catch(err){btn.disabled=false;btn.dataset.armed='';btn.textContent='Delete';toast(errMsg(err));}
  }
});
document.addEventListener('submit',async function(e){
  var f=e.target;
  if(f.id==='search-form'){e.preventDefault();if(S.route.name!=='home'&&S.route.name!=='cat')go('home');return;}
  if(f.id==='comment-form'){
    e.preventDefault();
    var name=document.getElementById('c-name').value.trim(),body=document.getElementById('c-body').value.trim();
    if(!name){showErr('c-error','Add your name.');document.getElementById('c-name').focus();return;}
    if(!body){showErr('c-error','Write a comment first.');document.getElementById('c-body').focus();return;}
    showErr('c-error','');
    var send=document.getElementById('c-send');send.disabled=true;send.textContent='Posting\u2026';
    var c={postId:S.route.id,name:name,body:body,createdAt:Date.now()};
    if(S.myId)c.authorId=S.myId;
    try{
      await saveComment(c);
      store('fieldnote.name',name);
      document.getElementById('c-body').value='';
      if(S.mode==='local')render();
      toast('Comment posted');
    }catch(err){showErr('c-error',errMsg(err));}
    var s2=document.getElementById('c-send');if(s2){s2.disabled=false;s2.textContent='Post comment';}
  }
});
var searchTimer=null;
qInput.addEventListener('input',function(){
  S.q=qInput.value;clearTimeout(searchTimer);
  searchTimer=setTimeout(function(){
    if(S.route.name==='home'||S.route.name==='cat'){render();}
    else if(S.q.trim()){go('home');}
  },140);
});

/* ---------- theme ---------- */
var SUN='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
var MOON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
var themeBtn=document.getElementById('theme-btn');
var darkQuery=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
function effectiveTheme(){
  var t=document.documentElement.getAttribute('data-theme');
  if(t==='dark'||t==='light')return t;
  return darkQuery&&darkQuery.matches?'dark':'light';
}
function paintThemeBtn(){
  var dark=effectiveTheme()==='dark',label=dark?'Switch to light mode':'Switch to dark mode';
  themeBtn.innerHTML=dark?SUN:MOON;
  themeBtn.setAttribute('aria-label',label);themeBtn.title=label;
}
var savedTheme=store('fieldnote.theme');
if(savedTheme==='dark'||savedTheme==='light')document.documentElement.setAttribute('data-theme',savedTheme);
themeBtn.addEventListener('click',function(){
  var next=effectiveTheme()==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  store('fieldnote.theme',next);
  paintThemeBtn();
});
if(darkQuery&&darkQuery.addEventListener)darkQuery.addEventListener('change',paintThemeBtn);
paintThemeBtn();

/* ---------- start ---------- */
S.route=parseRoute(location.hash);
syncChrome();render();
setTimeout(useLocal,2500);
initShared();
})();