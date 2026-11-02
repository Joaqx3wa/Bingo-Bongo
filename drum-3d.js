import * as THREE from './vendor/three.module.min.js';
import {DrumModel,SpinMotor,colorFor} from './drum.js?v=5';
const COLORS={red:'#ed3545',orange:'#ff8628',yellow:'#ffc629',green:'#16a15e',blue:'#1761ef',purple:'#854ce6'};

export class DrumRenderer{
  constructor(canvas,called,reducedMotion,total=90){
    this.canvas=canvas;this.model=new DrumModel(called,total);this.motor=new SpinMotor();this.reducedMotion=reducedMotion;this.active=false;this.exiting=null;this.meshes=new Map();this.frame=null;
    try{this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}
    catch(error){this.fallback=true;const replacement=canvas.cloneNode();canvas.replaceWith(replacement);this.canvas=replacement;this.ctx=replacement.getContext('2d');this.canvas.width=800;this.canvas.height=700;this.canvas.dataset.engine='perspective-fallback';this.describe();this.paint();return;}
    this.canvas.dataset.engine='webgl-3d';this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(38,1,.1,40);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x7893b6,3));
    for(const [color,intensity,position]of [[0xffffff,4,[3,7,5]],[0xc6ddff,3,[-5,4,-2]],[0xfff0d5,2,[2,2,-5]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);if(position[0]===3){light.castShadow=true;light.shadow.mapSize.set(512,512);Object.assign(light.shadow.camera,{left:-4,right:4,top:5,bottom:-4,near:.5,far:18});light.shadow.bias=-.0005;light.shadow.normalBias=.025;}this.scene.add(light);}
    const steel=new THREE.MeshStandardMaterial({color:0xc5d4e6,metalness:.64,roughness:.28});const dark=new THREE.MeshStandardMaterial({color:0x547198,metalness:.6,roughness:.35});const blue=new THREE.MeshStandardMaterial({color:0x1761ef,metalness:.15,roughness:.3});const gold=new THREE.MeshStandardMaterial({color:0xffc629,metalness:.4,roughness:.3});
    this.assembly=new THREE.Group();this.scene.add(this.assembly);
    const box=(w,h,d,x,y,z,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.assembly.add(mesh);return mesh;};
    box(3.9,.2,1.7,0,.1,0,blue);box(3.45,.08,1.3,0,-.035,0,dark);
    box(.15,2.13,.22,-1.98,1.25,0,steel);box(.15,2.13,.22,1.98,1.25,0,steel);
    const axle=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,4.35,20),dark);axle.rotation.z=Math.PI/2;axle.position.y=2.3;this.assembly.add(axle);
    this.cage=new THREE.Group();this.cage.position.y=2.3;this.assembly.add(this.cage);
    for(let i=0;i<12;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.73,.016,6,96),i%4===0?blue:steel);ring.rotation.x=i*Math.PI/12;this.cage.add(ring);}
    for(const x of [-1.38,-.88,0,.88,1.38]){const radius=Math.sqrt(1.73**2-x*x),ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.022,8,80),steel);ring.rotation.y=Math.PI/2;ring.position.x=x;this.cage.add(ring);}
    for(const angle of [0,Math.PI]){const paddle=new THREE.Mesh(new THREE.BoxGeometry(2.25,.06,.27),gold);paddle.position.set(0,Math.cos(angle)*1.49,Math.sin(angle)*1.49);paddle.rotation.x=angle;this.cage.add(paddle);}
    this.crank=new THREE.Group();this.crank.position.set(2.13,2.3,0);this.assembly.add(this.crank);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.09,.57,.09),steel);arm.position.y=-.25;this.crank.add(arm);
    const handle=new THREE.Mesh(new THREE.CapsuleGeometry(.10,.25,6,12),new THREE.MeshPhysicalMaterial({color:0xed3545,roughness:.2,clearcoat:1}));handle.rotation.z=Math.PI/2;handle.position.set(.15,-.52,0);this.crank.add(handle);
    this.balls=new THREE.Group();this.balls.position.y=2.3;this.assembly.add(this.balls);
    this.ballGeometry=new THREE.SphereGeometry(.16,22,16);
    // An open chute with a hinged gate, leading out of the spherical cage.
    const chute=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.48,24,1,true),new THREE.MeshStandardMaterial({color:0xa8c8ec,metalness:.35,roughness:.25,side:THREE.DoubleSide,transparent:true,opacity:.6}));chute.position.set(0,.40,.35);chute.rotation.x=-.45;this.assembly.add(chute);
    this.gate=box(.42,.055,.29,0,.61,.05,gold);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(4,64),new THREE.MeshBasicMaterial({color:0xd6e2f8,transparent:true,opacity:.35}));floor.rotation.x=-Math.PI/2;floor.position.y=-.09;floor.scale.set(1,.7,1);this.scene.add(floor);
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(19,37,68,.38)');gradient.addColorStop(.5,'rgba(19,37,68,.18)');gradient.addColorStop(1,'rgba(19,37,68,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);const contact=new THREE.Mesh(new THREE.PlaneGeometry(6,3.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.set(0,-.078,.15);this.scene.add(contact);
    const shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.ShadowMaterial({opacity:.2}));shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=-.084;shadowFloor.receiveShadow=true;this.scene.add(shadowFloor);
    this.reset(called,total);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas.parentElement);this.resize();
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.setActive(false);});this.canvas.addEventListener('webglcontextrestored',()=>this.setActive(true));
  }
  texture(n){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=COLORS[colorFor(n)];c.fillRect(0,0,256,128);
    for(const x of [64,192]){c.fillStyle='#fffdf3';c.beginPath();c.arc(x,64,26,0,Math.PI*2);c.fill();c.fillStyle='#15274d';c.font='900 31px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(String(n),x,65);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  mesh(n){if(!this.meshes.has(n)){const material=new THREE.MeshPhysicalMaterial({map:this.texture(n),roughness:.22,metalness:.03,clearcoat:1,clearcoatRoughness:.15});const mesh=new THREE.Mesh(this.ballGeometry,material);this.meshes.set(n,mesh);this.balls.add(mesh);}return this.meshes.get(n);}
  resize(){if(this.fallback)return;const w=this.canvas.parentElement.clientWidth,h=this.canvas.parentElement.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;const distance=Math.max(4.9/(2*Math.tan(19*Math.PI/180)),5.5/(2*Math.tan(19*Math.PI/180)*this.camera.aspect));this.camera.position.copy(new THREE.Vector3(3.7,2.0,7.8).normalize().multiplyScalar(distance));this.camera.position.y+=2.0;this.camera.lookAt(0,2.0,0);this.camera.updateProjectionMatrix();this.paint();}
  hitTest(x,y){if(this.fallback)return true;const rect=this.canvas.getBoundingClientRect(),pointer=new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.raycaster ||= new THREE.Raycaster();this.raycaster.setFromCamera(pointer,this.camera);if(this.raycaster.ray.intersectsSphere(new THREE.Sphere(new THREE.Vector3(0,2.3,0),1.8)))return true;return this.raycaster.intersectObject(this.assembly,true).some(hit=>hit.object.visible);}
  attachTo(container){container.append(this.canvas);if(this.resizeObserver){this.resizeObserver.disconnect();this.resizeObserver.observe(container);}this.resize();}
  setActive(active){this.active=active;if(active&&!this.frame){this.last=performance.now();this.frame=requestAnimationFrame(t=>this.tick(t));}else if(!active&&this.frame){cancelAnimationFrame(this.frame);this.frame=null;}}
  tick(t){const elapsed=Math.min((t-this.last)/1000,.12),dt=Math.min(elapsed,1/30),advance=this.motor.step(elapsed);const speed=dt>0?advance/dt:0;this.model.step(dt,this.reducedMotion?-speed*.28:-speed);this.last=t;this.paint(t);this.canvas.dataset.spinning=String(this.motor.running);this.canvas.dataset.turns=String(this.motor.turns);this.canvas.dataset.angle=this.model.angle.toFixed(3);this.frame=this.active?requestAnimationFrame(time=>this.tick(time)):null;}
  kick(){this.motor.kick();}
  reset(called,total=this.model.total){this.model.reset(called,total);this.motor=new SpinMotor();this.exiting=null;this.describe();this.paint();}
  extract(n){const ball=this.model.remove(n);if(ball)this.exiting={...ball,start:performance.now()};this.describe();return ball;}
  describe(){this.canvas.setAttribute('aria-label',`Girar el bombo 3D. ${this.model.balls.length} pelotas dentro`);this.canvas.dataset.ballCount=this.model.balls.length;}
  paint(t=performance.now()){
    if(this.fallback){this.paintFallback(t);return;}if(!this.cage)return;
    this.cage.rotation.x=this.model.angle;this.crank.rotation.x=this.model.angle;
    for(const mesh of this.meshes.values())mesh.visible=false;
    for(const b of this.model.balls){const mesh=this.mesh(b.n);mesh.visible=true;mesh.position.set(b.x/100,b.y/100,b.z/100);mesh.rotation.set(b.rotation*.5,b.rotation,0);}
    this.gate.rotation.x=this.exiting?-.9:0;
    if(this.exiting){const b=this.exiting,p=Math.min((t-b.start)/1050,1),q=Math.min(p/.5,1),mesh=this.mesh(b.n);mesh.visible=true;mesh.position.set(b.x/100*(1-q),p<.5?b.y/100*(1-q)-1.66*q:-1.66-.40*((p-.5)*2)**2,b.z/100*(1-q)+.5*Math.max(0,(p-.5)*2));mesh.rotation.x=p*4;}
    this.renderer.render(this.scene,this.camera);
  }
  paintFallback(t){
    const c=this.ctx;c.clearRect(0,0,800,700);const project=(x,y,z)=>{const scale=500/(500+z);return{x:400+x*scale*1.2,y:330-y*scale*1.2,s:scale};};
    c.lineWidth=13;c.strokeStyle='#8aabd0';c.beginPath();c.moveTo(160,325);c.lineTo(160,580);c.lineTo(640,580);c.lineTo(640,325);c.stroke();c.fillStyle='#1761ef';c.fillRect(220,580,360,22);
    const angle=this.model.angle;for(let ring=0;ring<10;ring++){c.beginPath();for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,x=Math.cos(a)*173,y=Math.sin(a)*173*Math.cos(ring*Math.PI/10),z=Math.sin(a)*173*Math.sin(ring*Math.PI/10),p=project(x,y*Math.cos(angle)-z*Math.sin(angle),y*Math.sin(angle)+z*Math.cos(angle));i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.strokeStyle=ring%3?'#a9bfdc88':'#1761ef99';c.lineWidth=2;c.stroke();}
    for(const b of [...this.model.balls].sort((a,b)=>b.z-a.z)){const p=project(b.x,b.y,b.z),r=16*p.s*1.2,g=c.createRadialGradient(p.x-r*.3,p.y-r*.4,1,p.x,p.y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.3,COLORS[colorFor(b.n)]);g.addColorStop(1,'#1b3559');c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,r*.59,0,Math.PI*2);c.fill();c.fillStyle='#18274b';c.font=`bold ${r}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(b.n,p.x,p.y);}
  }
}
