const vertexTable = document.getElementById('vertex-table').querySelector('tbody');
const addVertexBtn = document.getElementById('add-vertex');
const removeVertexBtn = document.getElementById('remove-vertex');
const heightInput = document.getElementById('height');
const surfaceSpan = document.getElementById('surface');
const volumeSpan = document.getElementById('volume');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const threeContainer = document.getElementById('three-container');
const toggle3d = document.getElementById('toggle3d');
const pointsTable = document.getElementById('points-table').querySelector('tbody');
const generateBtn = document.getElementById('generate');
const clearBtn = document.getElementById('clear');
const warningDiv = document.getElementById('warning');
const circleToggles = document.querySelectorAll('.circle-toggle');

let vertices = [
  {x:0,y:0},
  {x:5,y:0},
  {x:5,y:3},
  {x:0,y:3}
];
let sources = [
  {name:'F1',x:1,y:1,z:1},
  {name:'F2',x:4,y:3,z:1}
];
let micros = [];
let dragPoint = null;

function init(){
  renderVertexTable();
  updateSurfaceVolume();
  const ok=validatePoints();
  renderPointsTable();
  warningDiv.classList.toggle('hidden',ok);
  draw();
}

function renderVertexTable(){
  vertexTable.innerHTML = '';
  vertices.forEach((v,i)=>{
    const row = document.createElement('tr');
    row.innerHTML = `<td>V${i+1}</td><td><input type="number" step="0.1" value="${v.x}" data-index="${i}" data-field="x" class="vertex-input"></td><td><input type="number" step="0.1" value="${v.y}" data-index="${i}" data-field="y" class="vertex-input"></td>`;
    vertexTable.appendChild(row);
  });
  document.querySelectorAll('.vertex-input').forEach(inp=>{
    inp.addEventListener('change', e=>{
      const idx = +e.target.dataset.index;
      vertices[idx][e.target.dataset.field] = parseFloat(e.target.value);
      updateSurfaceVolume();
      const ok=validatePoints();
      renderPointsTable();
      warningDiv.classList.toggle('hidden',ok);
      draw();
    });
  });
}

addVertexBtn.onclick = () => {
  vertices.push({x:0,y:0});
  renderVertexTable();
  updateSurfaceVolume();
  const ok=validatePoints();
  renderPointsTable();
  warningDiv.classList.toggle('hidden',ok);
  draw();
};

removeVertexBtn.onclick = () => {
  if(vertices.length>4){
    vertices.pop();
    renderVertexTable();
    updateSurfaceVolume();
    const ok=validatePoints();
    renderPointsTable();
    warningDiv.classList.toggle('hidden',ok);
    draw();
  }
};

heightInput.onchange = ()=>{
  updateSurfaceVolume();
  const ok=validatePoints();
  renderPointsTable();
  warningDiv.classList.toggle('hidden',ok);
  draw();
};

function polygonArea(pts){
  let a=0; for(let i=0;i<pts.length;i++){ let j=(i+1)%pts.length; a += pts[i].x*pts[j].y - pts[j].x*pts[i].y; }
  return Math.abs(a/2);
}

function updateSurfaceVolume(){
  const area = polygonArea(vertices);
  const height = parseFloat(heightInput.value);
  surfaceSpan.textContent = area.toFixed(2);
  volumeSpan.textContent = (area*height).toFixed(2);
}

function renderPointsTable(){
  pointsTable.innerHTML='';
  [...sources,...micros].forEach((p,i)=>{
    const row=document.createElement('tr');
    if(p.invalid) row.classList.add('invalid');
    row.innerHTML=`<td>${p.name}</td><td><input type="number" step="0.1" value="${p.x}" data-name="${p.name}" data-field="x" class="point-input"></td><td><input type="number" step="0.1" value="${p.y}" data-name="${p.name}" data-field="y" class="point-input"></td><td><input type="number" step="0.1" value="${p.z}" data-name="${p.name}" data-field="z" class="point-input"></td>`;
    pointsTable.appendChild(row);
  });
  document.querySelectorAll('.point-input').forEach(inp=>{
    inp.addEventListener('change',e=>{
      const name=e.target.dataset.name;
      const field=e.target.dataset.field;
      const arr=[...sources,...micros];
      const p=arr.find(pt=>pt.name===name);
      p[field]=parseFloat(e.target.value);
      const ok=validatePoints();
      renderPointsTable();
      warningDiv.classList.toggle('hidden',ok);
      draw();
    });
  });
}

function drawGrid(){
  ctx.save();
  ctx.strokeStyle='#eee';
  ctx.lineWidth=1;
  for(let x=0;x<=canvas.width;x+=5){
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,canvas.height);
    ctx.stroke();
  }
  for(let y=0;y<=canvas.height;y+=5){
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(canvas.width,y);
    ctx.stroke();
  }
  ctx.strokeStyle='#000';
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(0,canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0,canvas.height);
  ctx.lineTo(canvas.width,canvas.height);
  ctx.stroke();
  ctx.fillStyle='black';
  ctx.font='10px Arial';
  for(let i=0;i<=canvas.width/25;i++){
    const x=i*25;
    const val=(i*0.5).toFixed(1);
    const tx = i===0 ? 2 : x-5;
    ctx.fillText(val,tx,canvas.height-2);
  }
  for(let i=0;i<=canvas.height/25;i++){
    const y=canvas.height - i*25;
    const val=(i*0.5).toFixed(1);
    const ty = i===0 ? canvas.height-2 : y+3;
    ctx.fillText(val,2,ty);
  }
  ctx.fillText('X',canvas.width-10,canvas.height-2);
  ctx.fillText('Y',2,10);
  ctx.restore();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawGrid();
  // polygon
  ctx.beginPath();
  vertices.forEach((v,i)=>{
    const x=v.x*50; const y=canvas.height - v.y*50;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.closePath();
  ctx.stroke();
  // points
  [...sources,...micros].forEach(p=>{
    drawPoint(p);
    drawLabels(p);
  });
  drawCircles();
}

function drawPoint(p){
  const color = p.name.startsWith('F') ? 'red' : 'blue';
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(p.x*50, canvas.height - p.y*50, 5,0,Math.PI*2);
  ctx.fill();
}

function drawLabels(p){
  ctx.fillStyle='black';
  ctx.font='10px Arial';
  ctx.fillText(`${p.name} (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`, p.x*50+6, canvas.height - p.y*50-6);
}

function drawCircles(){
  circleToggles.forEach(chk=>{
    if(chk.checked){
      const group=chk.dataset.group;
      const r=parseFloat(chk.value);
      const pts=group==='red'?sources:micros;
      pts.forEach(p=>{
        ctx.strokeStyle=group; ctx.globalAlpha=0.4; ctx.beginPath(); ctx.arc(p.x*50, canvas.height - p.y*50, r*50,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
      });
    }
  });
}

function distance(a,b){
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
}

function pointInside(pt){
  let x=pt.x,y=pt.y; let inside=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
    const xi=vertices[i].x, yi=vertices[i].y;
    const xj=vertices[j].x, yj=vertices[j].y;
    const intersect=((yi>y)!=(yj>y)) && (x < (xj - xi)*(y - yi)/(yj - yi)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

function minEdgeDistance(pt){
  let min=Infinity;
  for(let i=0;i<vertices.length;i++){
    let j=(i+1)%vertices.length;
    const v1=vertices[i]; const v2=vertices[j];
    const d=distancePointToSegment(pt,{x:v1.x,y:v1.y},{x:v2.x,y:v2.y});
    if(d<min) min=d;
  }
  return min;
}

function distancePointToSegment(p,v,w){
  const l2=(v.x-w.x)**2+(v.y-w.y)**2; if(l2===0) return Math.hypot(p.x-v.x,p.y-v.y);
  let t=((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t=Math.max(0,Math.min(1,t));
  const proj={x:v.x+t*(w.x-v.x),y:v.y+t*(w.y-v.y)};
  return Math.hypot(p.x-proj.x,p.y-proj.y);
}

function validatePoints(){
  const all=[...sources,...micros];
  let valid=true;
  const height=parseFloat(heightInput.value);
  all.forEach(p=>p.invalid=false);
  all.forEach(p=>{
    if(!pointInside(p) || minEdgeDistance(p)<0.5 || p.z<0.5 || p.z>height-0.5){
      p.invalid=true; valid=false;
    }
  });
  // duplicates
  for(let i=0;i<all.length;i++){
    for(let j=i+1;j<all.length;j++){
      if(all[i].x===all[j].x && all[i].y===all[j].y && all[i].z===all[j].z){
        all[i].invalid=all[j].invalid=true; valid=false;
      }
    }
  }
  // F1-F2
  if(distance(sources[0],sources[1])<0.7){
    sources[0].invalid=sources[1].invalid=true; valid=false;
  }
  // red-blue
  sources.forEach(s=>{
    micros.forEach(m=>{
      if(distance(s,m)<1){ s.invalid=true; m.invalid=true; valid=false; }
    });
  });
  // blue-blue
  for(let i=0;i<micros.length;i++){
    for(let j=i+1;j<micros.length;j++){
      if(distance(micros[i],micros[j])<0.7){
        micros[i].invalid=micros[j].invalid=true; valid=false;
      }
    }
  }
  return valid;
}

function generateMicros(){
  micros=[]; let attempts=0; let success=true;
  while(micros.length<5 && attempts<1000){
    attempts++;
    const bb=minBounding();
    const pt={
      name:`P${micros.length+1}`,
      x: +(bb.minX + Math.random()*(bb.maxX-bb.minX)).toFixed(1),
      y: +(bb.minY + Math.random()*(bb.maxY-bb.minY)).toFixed(1),
      z: +(0.5 + Math.random()*(parseFloat(heightInput.value)-0.5)).toFixed(1)
    };
    if(!pointInside(pt)) continue;
    if(minEdgeDistance(pt)<0.5) continue;
    if(sources.some(s=>distance(s,pt)<1)) continue;
    if(micros.some(m=>distance(m,pt)<0.7)) continue;
    if(micros.concat(sources).some(p=>p.x===pt.x && p.y===pt.y && p.z===pt.z)) continue;
    micros.push(pt);
  }
  if(micros.length<5) success=false;
  return success;
}

function minBounding(){
  let xs=vertices.map(v=>v.x); let ys=vertices.map(v=>v.y);
  return {minX:Math.min(...xs)+0.5, maxX:Math.max(...xs)-0.5, minY:Math.min(...ys)+0.5, maxY:Math.max(...ys)-0.5};
}

generateBtn.onclick=()=>{
  const genOk=generateMicros();
  const ok=validatePoints();
  renderPointsTable();
  draw();
  warningDiv.classList.toggle('hidden',genOk && ok);
};

clearBtn.onclick=()=>{
  micros=[];
  const ok=validatePoints();
  renderPointsTable();
  warningDiv.classList.toggle('hidden',ok);
  draw();
};

circleToggles.forEach(chk=>chk.onchange=draw);

canvas.addEventListener('mousedown',e=>{
  const rect=canvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)/50;
  const y=(canvas.height-(e.clientY-rect.top))/50;
  const all=[...sources,...micros];
  dragPoint=all.find(p=>Math.hypot(p.x-x,p.y-y)<0.2);
});

canvas.addEventListener('mousemove',e=>{
  if(dragPoint){
    const rect=canvas.getBoundingClientRect();
    dragPoint.x=+((e.clientX-rect.left)/50).toFixed(1);
    dragPoint.y=+((canvas.height-(e.clientY-rect.top))/50).toFixed(1);
    const ok=validatePoints();
    renderPointsTable();
    warningDiv.classList.toggle('hidden',ok);
    draw();
  }
});

canvas.addEventListener('mouseup',()=>{dragPoint=null;});

toggle3d.onchange=()=>{
  if(toggle3d.checked){
    canvas.classList.add('hidden');
    threeContainer.classList.remove('hidden');
    render3D();
  }else{
    threeContainer.innerHTML='';
    canvas.classList.remove('hidden');
    draw();
  }
};

function render3D(){
  threeContainer.innerHTML='';
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(75,600/400,0.1,1000);
  const renderer=new THREE.WebGLRenderer();
  renderer.setSize(600,400);
  threeContainer.appendChild(renderer.domElement);
  const shape=new THREE.Shape(vertices.map(v=>new THREE.Vector2(v.x,v.y)));
  const extrude=new THREE.ExtrudeGeometry(shape,{depth:parseFloat(heightInput.value),bevelEnabled:false});
  const material=new THREE.MeshBasicMaterial({color:0xdddddd,wireframe:true});
  const mesh=new THREE.Mesh(extrude,material);
  scene.add(mesh);
  [...sources,...micros].forEach(p=>{
    const geom=new THREE.SphereGeometry(0.05,16,16);
    const mat=new THREE.MeshBasicMaterial({color:p.name.startsWith('F')?0xff0000:0x0000ff});
    const sphere=new THREE.Mesh(geom,mat);
    sphere.position.set(p.x,p.y,p.z);
    scene.add(sphere);
  });
  camera.position.set(5,5,10);
  camera.lookAt(0,0,0);
  renderer.render(scene,camera);
}

init();
