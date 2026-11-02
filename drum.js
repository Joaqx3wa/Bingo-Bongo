// The simulation owns exactly one particle for every undrawn number.
export const BALL_COLORS = ['red','orange','yellow','green','blue','purple'];
export const colorFor = n => BALL_COLORS[Math.floor((n - 1) / 15)];
const paints = {
  red:['#ff9da1','#ed3545','#a11123'], orange:['#ffd0a5','#ff8628','#b24b07'],
  yellow:['#fff6b6','#ffd02d','#cf8906'], green:['#a1f6c1','#17ac64','#086e3b'],
  blue:['#a0cdff','#1761ef','#06318e'], purple:['#d9baff','#854ce6','#44218f']
};
export class DrumModel {
  constructor(called = []) { this.angle = 0; this.reset(called); }
  reset(called = []) {
    const positions = [];
    for (let y = 145, row = 0; y >= -150; y -= 21, row++) for (let x = -155 + (row%2)*12; x <= 155; x += 24) {
      if (x*x+y*y < 154*154) positions.push({x,y});
    }
    this.balls = Array.from({length:90},(_,i)=>i+1).filter(n=>!called.includes(n)).map((n,i)=>({ n, ...positions[i], vx:0, vy:0, rotation:n*.3 }));
  }
  remove(n) { const i = this.balls.findIndex(b=>b.n===n); return i === -1 ? null : this.balls.splice(i,1)[0]; }
  step(dt, mixing) {
    dt = Math.min(dt,1/30);
    this.angle += dt*(mixing?2.5:.025);
    for (const b of this.balls) {
      // Gravity, wall friction and an upward scoop produce tumbling, not an orbit.
      b.vy += 260*dt;
      if (mixing) {
        b.vx += -b.y * 3.5 * dt;
        b.vy += b.x * 3.5 * dt;
        if (b.y > 80) { b.vy -= 500*dt; b.vx += 160*dt; }
      }
      const speed = Math.hypot(b.vx,b.vy);
      if (speed > 330) { b.vx *= 330/speed; b.vy *= 330/speed; }
      b.vx *= .997; b.vy *= .997;
      b.x += b.vx*dt; b.y += b.vy*dt;
      b.rotation += b.vx*dt*.014;
    }
    for (let iteration=0;iteration<3;iteration++) {
      for(let i=0;i<this.balls.length;i++) for(let j=i+1;j<this.balls.length;j++) {
        const a=this.balls[i],b=this.balls[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        if(d<22.8 && d>.00001) {
          const nx=dx/d,ny=dy/d,overlap=(22.8-d)/2;
          a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
          const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
          if(relative<0) { const impulse=relative*.8;a.vx+=impulse*nx;a.vy+=impulse*ny;b.vx-=impulse*nx;b.vy-=impulse*ny; }
        }
      }
      for(const b of this.balls) {
        const distance=Math.hypot(b.x,b.y),limit=161;
        if(distance>limit) {
          const nx=b.x/distance,ny=b.y/distance;
          b.x=nx*limit;b.y=ny*limit;
          const outward=b.vx*nx+b.vy*ny;
          if(outward>0) { b.vx-=1.65*outward*nx;b.vy-=1.65*outward*ny; }
          if(mixing) { b.vx-=ny*30*dt;b.vy+=nx*30*dt; }
        }
      }
    }
  }
}
export class DrumRenderer {
  constructor(canvas,called,reducedMotion) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.model=new DrumModel(called);
    this.reducedMotion=reducedMotion;this.mixing=false;this.active=false;this.frame=null;this.exiting=null;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=600*dpr;canvas.height=520*dpr;this.ctx.scale(dpr,dpr);
    this.paint();
  }
  setActive(active) { this.active=active; if(active&&!this.frame) {this.last=performance.now();this.frame=requestAnimationFrame(t=>this.tick(t));} if(!active&&this.frame) {cancelAnimationFrame(this.frame);this.frame=null;} }
  tick(t) {
    if(!this.reducedMotion)this.model.step(Math.min((t-this.last)/1000,1/30),this.mixing);this.last=t;this.paint(t);
    this.frame=this.active?requestAnimationFrame(time=>this.tick(time)):null;
  }
  reset(called) {this.model.reset(called);this.exiting=null;this.paint();this.describe();}
  extract(n) { const ball=this.model.remove(n);if(ball)this.exiting={...ball,start:performance.now()};this.describe();return ball; }
  describe() {this.canvas.setAttribute('aria-label',`Bombo con ${this.model.balls.length} pelotas: ${this.model.balls.map(b=>b.n).join(', ')}`);this.canvas.dataset.ballCount=String(this.model.balls.length);}
  ball(b,x,y,r=11.4) {
    const c=this.ctx,[light,base,dark]=paints[colorFor(b.n)];
    c.save();c.translate(x,y);c.rotate(b.rotation||0);
    const gradient=c.createRadialGradient(-r*.35,-r*.4,r*.05,0,0,r);gradient.addColorStop(0,light);gradient.addColorStop(.48,base);gradient.addColorStop(1,dark);
    c.fillStyle=gradient;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.shadowColor='#17346040';c.shadowBlur=3;c.shadowOffsetY=2;c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#fffced';c.beginPath();c.arc(0,0,r*.59,0,Math.PI*2);c.fill();c.fillStyle='#15274d';c.font=`900 ${r*.88}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(b.n),0,.5);
    c.fillStyle='#ffffffa0';c.beginPath();c.ellipse(-r*.34,-r*.61,r*.29,r*.12,-.5,0,Math.PI*2);c.fill();c.restore();
  }
  paint(t=performance.now()) {
    const c=this.ctx;c.clearRect(0,0,600,520);
    const shadow=c.createRadialGradient(300,465,10,300,465,175);shadow.addColorStop(0,'#203f6d30');shadow.addColorStop(1,'#203f6d00');c.save();c.translate(0,352);c.scale(1,.25);c.fillStyle=shadow;c.beginPath();c.arc(300,465,175,0,Math.PI*2);c.fill();c.restore();
    // Cast-metal feet and the U-shaped stand.
    const metal=c.createLinearGradient(0,0,600,0);metal.addColorStop(0,'#526c94');metal.addColorStop(.25,'#d9e5f5');metal.addColorStop(.5,'#8ba2c0');metal.addColorStop(.75,'#eef5ff');metal.addColorStop(1,'#526c94');
    c.strokeStyle=metal;c.lineWidth=15;c.lineCap='round';c.beginPath();c.moveTo(160,225);c.lineTo(160,413);c.quadraticCurveTo(300,463,440,413);c.lineTo(440,225);c.stroke();
    c.fillStyle='#1761ef';c.beginPath();c.roundRect(162,449,276,22,10);c.fill();c.fillStyle='#1044ab';c.beginPath();c.roundRect(188,467,225,7,3);c.fill();
    c.save();c.translate(300,218);
    const glass=c.createRadialGradient(-60,-70,5,0,0,179);glass.addColorStop(0,'#ffffffc0');glass.addColorStop(.7,'#e3eeff70');glass.addColorStop(1,'#9cb8e650');c.fillStyle=glass;c.beginPath();c.arc(0,0,178,0,Math.PI*2);c.fill();
    // Rear meridians.
    c.strokeStyle='#7094bf2b';c.lineWidth=1.5;
    for(let i=0;i<6;i++){c.save();c.rotate(this.model.angle+i*Math.PI/6);c.beginPath();c.ellipse(0,0,177,60,0,0,Math.PI*2);c.stroke();c.restore();}
    for(const b of this.model.balls)this.ball(b,b.x,b.y);
    // Front cage hoops rotate with the crank. Balls remain inside the sphere.
    c.strokeStyle='#6685b04a';c.lineWidth=2;
    for(let i=0;i<4;i++){c.save();c.rotate(this.model.angle*.8+i*Math.PI/4);c.beginPath();c.ellipse(0,0,177,95,0,0,Math.PI);c.stroke();c.restore();}
    const rim=c.createLinearGradient(-178,-178,178,178);rim.addColorStop(0,'#f8fcff');rim.addColorStop(.18,'#7e99bd');rim.addColorStop(.4,'#dce9fc');rim.addColorStop(.64,'#6384ad');rim.addColorStop(.85,'#f0f7ff');rim.addColorStop(1,'#738daf');
    c.strokeStyle=rim;c.lineWidth=9;c.beginPath();c.arc(0,0,179,0,Math.PI*2);c.stroke();c.strokeStyle='#fff9';c.lineWidth=1;c.beginPath();c.arc(0,0,175,0,Math.PI*2);c.stroke();
    c.strokeStyle='#ffffff7a';c.lineWidth=4;c.beginPath();c.arc(-5,-3,160,3.65,4.9);c.stroke();
    c.restore();
    // Axle caps and a real crank handle.
    for(const x of [119,481]) {c.fillStyle=metal;c.beginPath();c.arc(x,218,13,0,Math.PI*2);c.fill();c.fillStyle='#567398';c.beginPath();c.arc(x,218,5,0,Math.PI*2);c.fill();}
    c.save();c.translate(481,218);c.rotate(this.model.angle);c.strokeStyle='#718aad';c.lineWidth=7;c.beginPath();c.moveTo(0,0);c.lineTo(27,0);c.lineTo(27,43);c.stroke();const handle=c.createLinearGradient(15,0,41,0);handle.addColorStop(0,'#ff9da1');handle.addColorStop(.5,'#ed3545');handle.addColorStop(1,'#a11123');c.fillStyle=handle;c.beginPath();c.roundRect(16,30,23,37,10);c.fill();c.restore();
    // Exit gate and chute; extraction is a single real particle leaving the drum.
    c.fillStyle='#7898be';c.beginPath();c.roundRect(280,391,40,14,5);c.fill();c.strokeStyle='#c0d3ed';c.lineWidth=4;c.beginPath();c.moveTo(286,402);c.lineTo(286,437);c.quadraticCurveTo(300,451,314,437);c.lineTo(314,402);c.stroke();
    if(this.exiting) {const p=Math.min((t-this.exiting.start)/550,1),b=this.exiting;this.ball(b,300+b.x*(1-p),218+b.y*(1-p)+220*p,11.4);}
  }
}
