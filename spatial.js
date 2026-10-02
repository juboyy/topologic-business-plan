(() => {
  'use strict';
  const body = document.body, root = document.getElementById('journey');
  const canvas = document.getElementById('topology'), ctx = canvas.getContext('2d');
  const panels = [...document.querySelectorAll('[data-destination]')];
  const nav = [...document.querySelectorAll('[data-waypoint]')];
  const names = ['Proposta', 'Por dentro', 'Construção', 'Capital', 'Receitas', 'Decisão'];
  const ids = panels.map(el => el.id), weights = [1.4, 1.6, 1.6, 2.6, 1.7, 1.1];
  const starts = [0, 1.4, 3, 4.6, 7.2, 8.9], total = 10;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const readToggle = document.getElementById('read-toggle'), viewToggle = document.getElementById('view-toggle');
  const labelsHost = document.getElementById('world-labels');
  const captions = ['Da Terra, a visão do todo. Uma galáxia de relações do negócio.', 'A entrega depende de pessoas e de uma única base tecnológica.', 'Homologar o núcleo antes de prometer a implantação.', 'Setores sólidos: caixa financiado. Contornos: meses ainda descobertos.', 'Cada caminho reutiliza o mesmo núcleo. Capacidade não se multiplica.', 'O mapa inteiro volta à vista. A decisão começa pelo caixa.'];
  const offers = {topologic:'Operação', diagnostico:'Diagnóstico', conhecimento:'Conhecimento', viva:'Topologia Viva', parceiros:'Parceiros'};
  const nodes = [
    {id:'terra', label:'Terra · início', x:-285,z:70,layer:0, detail:'Ponto de partida: uma necessidade real da operação. A Terra é a referência de retorno neste diagrama de negócio, não o centro físico da Via Láctea.'},
    {id:'oferta', label:'Proposta', x:-200,z:-190,layer:0, detail:'O comprador financia um recorte: R$ 200 mil de implantação e R$ 12 mil/mês. Contrato e entrada recebida precedem o trabalho. Preço de venda não é aporte dos sócios.'},
    {id:'entrega', label:'Entrega · 720h', x:35,z:-265,layer:0, detail:'A proposta exige 720 horas diretas em três meses. Depende de pessoas e da plataforma homologada. O custo direto é R$ 129.600, separado do P&D.'},
    {id:'pessoas', label:'Pessoas', x:250,z:-145,layer:1, detail:'Produto, engenharia e especialistas constroem e sustentam a base. Consomem caixa mensal. Pessoas de P&D não são contadas novamente como implantadores.'},
    {id:'plataforma', label:'Núcleo compartilhado', x:0,z:0,layer:0, detail:'Um único núcleo: grafo, fontes autorizadas, identidade, editor e conectores. Apoia a entrega e é reutilizado pelas novas ofertas. Depende de uma infraestrutura compartilhada.'},
    {id:'desenvolvimento', label:'Homologação', x:280,z:40,layer:0, detail:'Modelo persistente, fontes, permissões, benchmark e recuperação antecedem a homologação comercial. O primeiro ciclo de três meses exige R$ 211 mil, sem reserva.'},
    {id:'infra', label:'Uma DGX', x:55,z:230,layer:1, detail:'Uma DGX desde o início, com proteção, rede e backup. Equipamentos: R$ 76 mil. Preparação: R$ 24 mil. M0 total: R$ 100 mil. Cada oferta disputa a mesma fila.'},
    {id:'caixa', label:'Caixa', x:235,z:200,layer:2, detail:'O caixa paga M0 de R$ 100 mil e operação de R$ 37 mil/mês. A seleção de capital altera a fronteira financiada, nunca reduz os custos para fazer o plano caber.'},
    {id:'receita', label:'Operação', x:-205,z:215,layer:0, detail:'As ofertas se conectam ao núcleo por reutilização. Novas linhas não entram no fluxo de 24 meses e não criam outra DGX ou uma segunda equipe.'}
  ];
  const byId = Object.fromEntries(nodes.map(n => [n.id,n]));
  const edges = [
    ['terra','oferta','depends'], ['oferta','entrega','depends'], ['entrega','pessoas','depends'],
    ['entrega','plataforma','depends'], ['plataforma','infra','depends'], ['desenvolvimento','plataforma','depends'],
    ['pessoas','caixa','cost'], ['infra','caixa','cost'], ['receita','plataforma','reuse']
  ];
  const visibility = [
    ['terra','oferta','plataforma','entrega','caixa'], ['terra','entrega','pessoas','plataforma','infra'],
    ['terra','desenvolvimento','plataforma','pessoas'], ['terra','caixa','infra','pessoas','plataforma'],
    ['terra','receita','plataforma','infra'], ['terra','oferta','plataforma','caixa']
  ];
  const mobileVisibility = [['terra','oferta','plataforma'],['entrega','plataforma'],['desenvolvimento','plataforma'],['infra','caixa'],['receita','plataforma'],['terra','caixa']];
  let scene = 0, capital = 200000, revenue = 'topologic', step = 1, selected = '', reading = false, flat = false;
  let width = innerWidth, height = innerHeight, mobile = width <= 700, frame = 0, inView = true, target = 0, current = 0;
  let projection = {yaw:0,pitch:1.24,explode:.05,scale:1,cx:0,cy:0}, copyTop = 250;
  let instance = null;
  const clamp = (n,a,b) => Math.min(b, Math.max(a,n));
  const money = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL',maximumFractionDigits:0});
  const monthFormat = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const number = n => money.format(n).replace(/\u00a0/g,' ');
  const poses = [
    {yaw:-.08,pitch:.24,explode:.03,scale:.98}, {yaw:.16,pitch:.79,explode:.88,scale:.9},
    {yaw:.32,pitch:.68,explode:.64,scale:.92}, {yaw:.12,pitch:.85,explode:1.2,scale:.9},
    {yaw:-.2,pitch:.42,explode:.55,scale:.99}, {yaw:-.08,pitch:.24,explode:.12,scale:.96}
  ];
  const revenueOrbit = [
    {id:'topologic',x:-205,z:215}, {id:'diagnostico',x:-300,z:165},
    {id:'conhecimento',x:-290,z:285}, {id:'viva',x:-165,z:330}, {id:'parceiros',x:-65,z:305}
  ];
  // Fixed positions encode business roles. No force layout, random relationships or live telemetry.
  for (const n of nodes) {
    const el = document.createElement('button'); el.type='button'; el.className='node-label'; el.dataset.node=n.id;
    if(n.id==='terra') {
      el.classList.add('earth'); const image=document.createElement('img'); image.src='assets/earth.svg'; image.alt='Terra ilustrada, com oceanos e continentes'; image.width=84; image.height=84;
      const text=document.createElement('span'); text.textContent='Terra · início'; el.append(image,text); el.setAttribute('aria-label','Voltar à Terra, visão geral');
    } else el.textContent=n.label;
    el.addEventListener('click', () => { if(n.id==='terra') {selected=''; navigate(0,false); return;} selectNode(n.id); });
    el.setAttribute('aria-pressed','false'); labelsHost.append(el); n.el=el; n.sx=0; n.sy=0; n.depth=0;
  }
  const home = document.createElement('button'); home.type='button'; home.className='earth-home'; home.id='earth-home'; home.textContent='Voltar à Terra'; home.addEventListener('click',()=>{ selected='';navigate(0,false); }); document.querySelector('[data-sc-world]').append(home);
  const detail=document.getElementById('relation-detail');
  document.getElementById('relation-clear').addEventListener('click',()=>{ const previous=selected;selectNode(previous);byId[previous]?.el.focus({preventScroll:true}); });
  function selectNode(id) {
    selected = selected===id ? '' : id;
    detail.hidden=!selected;
    if(selected) {document.getElementById('relation-name').textContent=byId[id].label;document.getElementById('relation-description').textContent=byId[id].detail;}
    updateNodes();invalidate();
  }
  function related(id) { return !selected || id===selected || edges.some(e => (e[0]===selected&&e[1]===id)||(e[1]===selected&&e[0]===id)); }
  function updateNodes() {
    const allowed = selected ? [selected,...nodes.filter(n=>n.id!==selected&&related(n.id)).map(n=>n.id)].slice(0,mobile?2:6) : mobile ? mobileVisibility[scene] : visibility[scene];
    for(const n of nodes) {n.visible=allowed.includes(n.id);n.slot=allowed.indexOf(n.id);n.slotCount=allowed.length;n.el.hidden=!n.visible || reading;n.el.tabIndex=n.visible&&!reading?0:-1;n.el.classList.toggle('is-dim',!related(n.id));n.el.classList.toggle('is-related',!!selected&&related(n.id));n.el.classList.toggle('is-selected',selected===n.id);n.el.setAttribute('aria-pressed',String(selected===n.id));}
    body.classList.toggle('has-selection',!!selected&&!reading);
    if(!reading) {panels[scene].inert=!!selected&&mobile;panels[scene].setAttribute('aria-hidden',String(!!selected&&mobile));}
    home.hidden=reading;
  }
  function setScene(index) {
    if(index===scene && body.dataset.scene!==undefined) return;
    scene=index;body.dataset.scene=String(index);selected='';detail.hidden=true;body.classList.remove('has-selection');
    panels.forEach((p,i)=>{const active=i===index||reading;p.classList.toggle('is-current',i===index);p.inert=!active;p.setAttribute('aria-hidden',String(!active));});
    nav.forEach(el=>{if(+el.dataset.waypoint===index) el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');});
    document.getElementById('current-destination').textContent=names[index];document.getElementById('plane-caption').textContent=captions[index];updateNodes();fitCopy();
  }
  function navigate(index, focus=true) {
    index=clamp(index,0,5);
    if(reading){panels[index].scrollIntoView({behavior:'instant',block:'start'});if(focus)panels[index].focus({preventScroll:true});return;}
    const destination=(starts[index]+(index===0?0:weights[index]*.36))*height;
    // The canvas performs the controlled camera interpolation. The scroll jump does not hide intermediate controls.
    selected='';detail.hidden=true;updateNodes();scrollTo({top:destination,behavior:'instant'});target=destination/height;setScene(index);instance?.read();invalidate();
    history.replaceState(null,'','#'+ids[index]);if(focus)panels[index].focus({preventScroll:true});
  }
  nav.forEach(link=>link.addEventListener('click',e=>{e.preventDefault();navigate(+link.dataset.waypoint);}));
  document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault(); if(!reading)setReading(true);panels[0].focus({preventScroll:true});});
  function updateCapital(value) {
    capital=value;const remaining=value-100000, months=remaining/37000, full=Math.floor(months), partial=remaining-full*37000;
    document.querySelectorAll('[data-capital]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.capital===value)));
    document.getElementById('runway-value').textContent=months===0?'0':monthFormat.format(months);
    document.getElementById('capital-meaning').textContent=value===100000?'Todo o capital é consumido no M0. Nenhum mês de operação está financiado.':`${number(remaining)} disponíveis para operar: ${full===1?'um mês completo':'dois meses completos'} e ${number(partial)} do ${full===1?'segundo':'terceiro'}.`;
    document.getElementById('capital-gap').textContent=`Faltam ${number(211000-value)} para completar três meses.`;
    document.getElementById('funding-fill').style.transform=`scaleX(${months/6})`;
    byId.caixa.label=`Caixa · ${value/1000} mil`;byId.caixa.el.textContent=byId.caixa.label;
    fitCopy();invalidate();
  }
  document.querySelectorAll('[data-capital]').forEach(b=>b.addEventListener('click',()=>updateCapital(+b.dataset.capital)));
  function updateRevenue(id) {
    revenue=id;document.querySelectorAll('[data-revenue]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.revenue===id)));
    document.querySelectorAll('[data-offer]').forEach(a=>{a.hidden=!reading&&a.dataset.offer!==id;});
    const reuse={topologic:'A operação depende do grafo, das fontes, das permissões e dos conectores homologados. É a única oferta no fluxo de 24 meses.',diagnostico:'O diagnóstico reutiliza método, editor e processamento documental em janela agendada. Não exige integração produtiva. Nova hipótese fora das projeções.',conhecimento:'Conhecimento privado reutiliza ingestão, busca, identidade, armazenamento e IA local. Precisa de teste de isolamento e carga. Nova hipótese fora das projeções.',viva:'Topologia Viva reutiliza eventos, contexto do grafo, fila, auditoria e inferência. Depende da operação principal homologada. Expansão fora das projeções.',parceiros:'Parceiros reutilizam ontologias próprias, editor, conectores homologados e método. Não revendem dados de clientes. Preço e responsabilidades ainda não definidos.'};
    const position=revenueOrbit.find(item=>item.id===id);byId.receita.x=position.x;byId.receita.z=position.z;
    byId.receita.label=offers[id];byId.receita.detail=reuse[id];byId.receita.el.textContent=offers[id];fitCopy();invalidate();
  }
  document.querySelectorAll('[data-revenue]').forEach(b=>b.addEventListener('click',()=>updateRevenue(b.dataset.revenue)));
  function updateStep(index) {step=index;document.querySelectorAll('[data-development]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.development===index)));document.querySelectorAll('[data-step]').forEach(a=>{a.hidden=!reading&&+a.dataset.step!==index;});fitCopy();invalidate();}
  document.querySelectorAll('[data-development]').forEach(b=>b.addEventListener('click',()=>updateStep(+b.dataset.development)));
  function setReading(on) {
    if(!on&&(innerHeight<600||(innerWidth<=700&&innerHeight<780)))return;
    const returnScene=scene;reading=on;selected='';detail.hidden=true;body.classList.remove('has-selection');body.classList.toggle('reading',on);body.classList.toggle('spatial',!on);readToggle.setAttribute('aria-pressed',String(on));readToggle.textContent=on?'Voltar à galáxia':'Modo leitura';
    panels.forEach((p,i)=>{p.inert=!on&&i!==scene;p.setAttribute('aria-hidden',String(!on&&i!==scene));p.style.top='';});
    updateRevenue(revenue);updateStep(step);updateNodes();
    if(on){stopFrames();root.dataset.scVerifyState=`reading;capital=${capital};offer=${revenue}`;panels[returnScene].scrollIntoView({behavior:'instant'});}
    else {instance?.layout();resize();navigate(returnScene,false);}
  }
  readToggle.addEventListener('click',()=>setReading(!reading));
  viewToggle.addEventListener('click',()=>{flat=!flat;viewToggle.setAttribute('aria-pressed',String(flat));viewToggle.textContent=flat?'Ver em 3D':'Ver em 2D';invalidate();});
  function fitCopy() {
    if(reading||!mobile)return;
    const panel=panels[scene];copyTop=scene===0?120:Math.max(148,Math.min(250,height-132-panel.offsetHeight));panel.style.top=copyTop+'px';
    document.querySelector('.graph-legend').style.display=scene!==0&&copyTop<240?'none':'';
  }
  // Geometry is projected from actual x/y/z coordinates with an orthogonal camera basis and perspective.
  const projected = {x:0,y:0,d:0};
  function project(x,y,z) {
    const cy=Math.cos(projection.yaw),sy=Math.sin(projection.yaw),cp=Math.cos(projection.pitch),sp=Math.sin(projection.pitch);
    const rx=x*cy-z*sy,rz=x*sy+z*cy,ry=y*sp+rz*cp,depth=rz*sp-y*cp;
    const perspective=flat?1:1100/(1100+depth);
    projected.x=projection.cx+rx*projection.scale*perspective;projected.y=projection.cy+ry*projection.scale*perspective;projected.d=depth;
    return projected;
  }
  function point(n) {return project(n.x,n.layer*115*projection.explode,n.z);}
  function pathPoint(x,y,z,first=false) {const p=project(x,y,z);if(first)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
  const stars=[];let seed=9137;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
  for(let i=0;i<290;i++)stars.push({x:rand(),y:rand(),r:.4+rand()*.8,a:.12+rand()*.5});
  const galacticDust=[];
  for(let arm=0;arm<4;arm++)for(let i=0;i<86;i++){const u=i/85,angle=arm*Math.PI/2+u*2.6,r=55+u*310;galacticDust.push({x:Math.cos(angle)*r+(rand()-.5)*30,z:Math.sin(angle)*r+(rand()-.5)*30,r:.6+rand()*1.3,a:.1+rand()*.5});}
  function ring(radius,y,start=0,end=Math.PI*2,stroke='#5a6079',alpha=1) {ctx.beginPath();for(let i=0;i<=80;i++){const angle=start+(end-start)*i/80;pathPoint(Math.cos(angle)*radius,y,Math.sin(angle)*radius,i===0);}ctx.strokeStyle=stroke;ctx.globalAlpha=alpha;ctx.stroke();ctx.globalAlpha=1;}
  function drawOrbit() {
    const explode=projection.explode;
    ctx.lineWidth=1;ctx.setLineDash([]);
    for(let layer=2;layer>=0;layer--){const y=layer*115*explode;ring(310-layer*40,y,0,Math.PI*2,'#6e718c',layer===0?.4:.2+explode*.2);ring(95+layer*40,y,0,Math.PI*2,'#575e76',.25);}
    for(let arm=0;arm<4;arm++) {ctx.beginPath();for(let i=0;i<=72;i++){const u=i/72,angle=arm*Math.PI/2+u*2.6,r=40+u*305;pathPoint(Math.cos(angle)*r,0,Math.sin(angle)*r,i===0);}ctx.strokeStyle='#7c729f';ctx.globalAlpha=.28;ctx.stroke();}ctx.globalAlpha=1;
    for(const dust of galacticDust){const p=project(dust.x,0,dust.z);ctx.beginPath();ctx.arc(p.x,p.y,dust.r*(mobile?.65:1),0,Math.PI*2);ctx.fillStyle=`rgba(194,187,223,${dust.a})`;ctx.fill();}
    // The galactic nucleus is one shared platform, not one copy per offer.
    const center=project(0,0,0);ctx.fillStyle='#262535';ctx.beginPath();ctx.ellipse(center.x,center.y,48*projection.scale,Math.max(12,30*Math.sin(projection.pitch))*projection.scale,0,0,Math.PI*2);ctx.fill();
    ring(49,0,0,Math.PI*2,'#b9aaff',.9);ring(61,0,0,Math.PI*2,'#b9aaff',.42);
    // Vertical dependencies make the same galaxy open into work, infrastructure and cash strata.
    if(explode>.12)for(let i=0;i<3;i++){const angle=.7+i*2.05;ctx.beginPath();pathPoint(Math.cos(angle)*185,0,Math.sin(angle)*185,true);pathPoint(Math.cos(angle)*185,230*explode,Math.sin(angle)*185);ctx.strokeStyle='#67657d';ctx.globalAlpha=.3;ctx.setLineDash([3,6]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
  }
  function drawFunding() {
    if(scene!==3)return;
    const funded=(capital-100000)/37000,y=230*projection.explode,base=-Math.PI*.93;
    for(let month=0;month<6;month++){
      const from=base+month*.49,to=from+.43,amount=clamp(funded-month,0,1);
      ctx.beginPath();for(let j=0;j<=20;j++){const a=from+(to-from)*j/20;pathPoint(Math.cos(a)*280,y,Math.sin(a)*280,j===0);}for(let j=20;j>=0;j--){const a=from+(to-from)*j/20;pathPoint(Math.cos(a)*195,y,Math.sin(a)*195);}ctx.closePath();ctx.fillStyle='#191c29';ctx.fill();ctx.strokeStyle='#a4a0b9';ctx.lineWidth=1.3;ctx.stroke();
      if(amount>0){const end=from+(to-from)*amount;ctx.beginPath();for(let j=0;j<=20;j++){const a=from+(end-from)*j/20;pathPoint(Math.cos(a)*280,y,Math.sin(a)*280,j===0);}for(let j=20;j>=0;j--){const a=from+(end-from)*j/20;pathPoint(Math.cos(a)*195,y,Math.sin(a)*195);}ctx.closePath();ctx.fillStyle='#a99ce0';ctx.fill();}
      // Segment labels stay selectable in the accompanying financial reading, never masquerade as telemetry.
      const a=(from+to)/2,p=project(Math.cos(a)*239,y,Math.sin(a)*239);ctx.font=`600 ${mobile?12:16}px 'IBM Plex Sans',sans-serif`;ctx.fillStyle=amount>.55?'#14121d':'#e0dded';ctx.textAlign='center';ctx.fillText('M'+(month+1),p.x,p.y+5);
    }
  }
  function drawEdges() {
    for(const e of edges){const a=byId[e[0]],b=byId[e[1]];if(!a.visible&&!b.visible)continue;const highlighted=selected&&(e[0]===selected||e[1]===selected);ctx.globalAlpha=selected?(highlighted?1:.1):(a.visible&&b.visible?.8:.18);ctx.strokeStyle=highlighted?'#d9ccff':'#b0a5cd';ctx.lineWidth=highlighted?2:1.2;ctx.setLineDash(e[2]==='reuse'?[5,5]:[]);const p=point(a),ax=p.x,ay=p.y;const q=point(b),bx=q.x,by=q.y;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
      if(e[2]==='cost'){ctx.beginPath();ctx.moveTo(ax+3,ay+3);ctx.lineTo(bx+3,by+3);ctx.stroke();}
      const angle=Math.atan2(by-ay,bx-ax),mx=ax+(bx-ax)*.62,my=ay+(by-ay)*.62;ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(mx-7*Math.cos(angle-.45),my-7*Math.sin(angle-.45));ctx.moveTo(mx,my);ctx.lineTo(mx-7*Math.cos(angle+.45),my-7*Math.sin(angle+.45));ctx.stroke();
    }ctx.globalAlpha=1;ctx.setLineDash([]);
  }
  function drawNodes() {
    for(const n of nodes){const p=point(n);n.sx=p.x;n.sy=p.y;n.depth=p.d;ctx.globalAlpha=related(n.id)?1:.16;ctx.fillStyle=n.id==='plataforma'?'#b9aaff':'#c5c8da';ctx.beginPath();ctx.arc(p.x,p.y,n.id==='plataforma'?7:4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a69ac4';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,n.id==='plataforma'?14:9,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      if(n.visible){let lx=n.sx,ly=n.sy;if(mobile){const idx=n.slot;const regionTop=scene===0?Math.min(height-340,480):106,regionHeight=scene===0?180:Math.max(90,copyTop-120);lx=width*(.17+idx*(.66/Math.max(1,n.slotCount-1)));ly=regionTop+regionHeight*(idx===1?.65:.25); // Keep labels below the home control and preserve their projected anchors.
          ctx.beginPath();ctx.moveTo(n.sx,n.sy);ctx.lineTo(lx,ly);ctx.strokeStyle='#807994';ctx.globalAlpha=.7;ctx.stroke();ctx.globalAlpha=1;
        }
        const labelWidth=n.el.offsetWidth,labelHeight=n.el.offsetHeight;lx=clamp(lx,labelWidth/2+12,width-labelWidth/2-12);ly=clamp(ly,90+labelHeight/2,height-140-labelHeight/2);n.el.style.transform=`translate3d(${(lx-labelWidth/2).toFixed(1)}px,${(ly-labelHeight/2).toFixed(1)}px,0)`;
      }
    }
  }
  function drawRevenueBranches() {
    if(scene!==4)return;
    for(const offer of revenueOrbit) {
      const active=offer.id===revenue;ctx.globalAlpha=active?.95:.35;ctx.strokeStyle=active?'#d3c5ff':'#a19aae';ctx.lineWidth=active?2:1;ctx.setLineDash([4,5]);ctx.beginPath();pathPoint(0,0,0,true);pathPoint(offer.x*.56,0,offer.z*.65);pathPoint(offer.x,0,offer.z);ctx.stroke();ctx.setLineDash([]);
      const p=project(offer.x,0,offer.z);ctx.fillStyle=active?'#b9aaff':'#646779';ctx.beginPath();ctx.arc(p.x,p.y,active?8:5,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function render() {
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#101219';ctx.fillRect(0,0,width,height);
    for(const star of stars){ctx.globalAlpha=star.a;ctx.fillStyle='#bdc1d4';ctx.fillRect(star.x*width,star.y*height,star.r,star.r);}ctx.globalAlpha=1;
    let at=0;for(let i=1;i<6;i++)if(current>=starts[i])at=i;
    if(reduced.matches)at=scene;
    const t=reduced.matches?0:clamp((current-starts[at])/weights[at],0,1),next=Math.min(at+1,5),smooth=t*t*(3-2*t),a=poses[at],b=poses[next];
    projection.yaw=flat?0:a.yaw+(b.yaw-a.yaw)*smooth;projection.pitch=flat?0:a.pitch+(b.pitch-a.pitch)*smooth;projection.explode=flat?0:a.explode+(b.explode-a.explode)*smooth;
    const baseScale=mobile?(scene===0?width/790:Math.min(width/760,Math.max(85,copyTop-115)/530)):Math.min(width*.51/760,(height-245)/690);
    projection.scale=baseScale*(a.scale+(b.scale-a.scale)*smooth)*(at===5?1+t*.06:1);projection.cx=mobile?width*.5:width*.727;projection.cy=mobile?(scene===0?height-285:95+Math.max(90,copyTop-120)*.48):height*.48;
    if(!flat)projection.cy-=projection.explode*35*projection.scale;
    drawOrbit();drawFunding();drawRevenueBranches();drawEdges();drawNodes();
    const nucleus=byId.plataforma,earth=byId.terra,cash=byId.caixa;
    root.dataset.scVerifyState=`${names[scene]};${flat?'2d':'3d'};nucleus=${Math.round(nucleus.sx)},${Math.round(nucleus.sy)};earth=${Math.round(earth.sx)},${Math.round(earth.sy)};cash=${Math.round(cash.sx)},${Math.round(cash.sy)};depth=${projection.explode.toFixed(2)};funded=${((capital-100000)/37000).toFixed(3)};offer=${revenue};step=${step};selection=${selected||'none'}`;
  }
  function tick() {frame=0;if(reading||document.hidden||!inView)return;const delta=target-current;current=reduced.matches?target:Math.abs(delta)<.0005?target:current+delta*.12;render();if(Math.abs(target-current)>.0005)frame=requestAnimationFrame(tick);}
  function invalidate(){if(!frame&&!reading&&!document.hidden&&inView)frame=requestAnimationFrame(tick);}
  function stopFrames(){if(frame)cancelAnimationFrame(frame);frame=0;}
  function onScroll(){if(reading)return;target=clamp(scrollY/Math.max(height,1),0,total);let index=0;for(let i=1;i<6;i++)if(target>=starts[i])index=i;setScene(index);invalidate();}
  function resize(){
    width=innerWidth;height=innerHeight;mobile=width<=700;
    const compact=height<600||(mobile&&height<780);
    if(compact&&!reading)setReading(true);
    readToggle.disabled=compact;
    document.getElementById('compact-notice').hidden=!compact;
    readToggle.title=compact?'Leitura adaptada à altura disponível':'';
    if(compact)readToggle.textContent='Modo leitura';
    else if(reading)readToggle.textContent='Voltar à galáxia';
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);updateNodes();fitCopy();onScroll();invalidate();
  }
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>document.hidden?stopFrames():invalidate());
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)invalidate();else stopFrames();}).observe(canvas);
  reduced.addEventListener('change',()=>{current=target;root.dataset.reducedMotion=String(reduced.matches);invalidate();});
  addEventListener('hashchange',()=>{const i=ids.indexOf(location.hash.slice(1));if(i>=0)navigate(i,false);});
  if(!ctx||!window.ScrollCraft){body.classList.add('reading');return;}
  body.classList.add('spatial');root.dataset.reducedMotion=String(reduced.matches);instance=ScrollCraft.mount(document);
  updateCapital(capital);updateRevenue(revenue);updateStep(step);setScene(0);resize();
  function relayout(){dispatchEvent(new Event('resize'));instance.layout();fitCopy();invalidate();}
  addEventListener('load',relayout);document.fonts?.ready.then(relayout);
  const initial=ids.indexOf(location.hash.slice(1));if(initial>=0)navigate(initial,false);
  // Small deterministic interface for verification and explicit navigation, not a second rendering path.
  window.TopologicSpatial={goTo:navigate,setCapital:updateCapital,setRevenue:updateRevenue,setDevelopment:updateStep,setReading,selectNode,getState:()=>({scene:names[scene],capital,revenue,step,reading,flat,reducedMotion:reduced.matches,selected,settled:frame===0})};
})();
