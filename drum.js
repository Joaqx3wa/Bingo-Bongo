// The simulation owns exactly one particle for every undrawn number.
export const BALL_COLORS = ['red','orange','yellow','green','blue','purple'];
export const colorFor = n => BALL_COLORS[Math.floor((n - 1) / 15)];
export class SpinMotor {
  constructor(){this.remaining=0;this.speed=0;this.turns=0;}
  kick(){this.remaining=Math.min(this.remaining+Math.PI*3,Math.PI*40);this.speed=Math.max(this.speed,3);this.turns++;}
  step(dt){
    if(this.remaining<=0){this.speed=0;return 0;}
    const target=Math.min(11,Math.sqrt(5*this.remaining));
    this.speed=Math.min(this.speed+dt*18,target);
    const advance=Math.min(this.remaining,this.speed*dt);
    this.remaining-=advance;
    if(this.remaining<.008){this.remaining=0;this.speed=0;}
    return advance;
  }
  get running(){return this.remaining>0;}
}
export class DrumModel {
  constructor(called=[],total=90){this.angle=0;this.total=total;this.reset(called,total);}
  reset(called=[],total=this.total){
    this.total=total;this.angle=0;const positions=[];
    for(let y=-128;y<=140;y+=29)for(let z=-140;z<=140;z+=33)for(let x=-140;x<=140;x+=33)if(Math.hypot(x,y,z)<151)positions.push({x,y,z});
    positions.sort((a,b)=>a.y-b.y);const slots=positions.slice(0,total);for(let i=slots.length-1;i>0;i--){const j=(i*37+13)%(i+1);[slots[i],slots[j]]=[slots[j],slots[i]];}
    this.balls=Array.from({length:total},(_,i)=>({n:i+1,...slots[i],vx:0,vy:0,vz:0,rotation:i*.31})).filter(b=>!called.includes(b.n));
  }
  remove(n){const index=this.balls.findIndex(b=>b.n===n);return index<0?null:this.balls.splice(index,1)[0];}
  step(dt,mixing){
    dt=Math.min(dt,1/30);const omega=typeof mixing==='number'?mixing:mixing?2.5:0;this.angle+=dt*omega;
    const turn=dt*omega*.58,cos=Math.cos(turn),sin=Math.sin(turn);
    for(const b of this.balls){
      if(omega>.05){const y=b.y;b.y=y*cos-b.z*sin;b.z=y*sin+b.z*cos;b.vy-=b.z*omega*dt*1.1;b.vz+=b.y*omega*dt*1.1;b.rotation+=turn;}
      b.vy-=285*dt;b.vx*=.994;b.vy*=.994;b.vz*=.994;const speed=Math.hypot(b.vx,b.vy,b.vz);if(speed>420){b.vx*=420/speed;b.vy*=420/speed;b.vz*=420/speed;}
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
    }
    for(let pass=0;pass<3;pass++){
      for(let i=0;i<this.balls.length;i++)for(let j=i+1;j<this.balls.length;j++){
        const a=this.balls[i],b=this.balls[j],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz);
        if(d<32&&d>.0001){const nx=dx/d,ny=dy/d,nz=dz/d,overlap=(32-d)/2;a.x-=nx*overlap;a.y-=ny*overlap;a.z-=nz*overlap;b.x+=nx*overlap;b.y+=ny*overlap;b.z+=nz*overlap;
          const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny+(b.vz-a.vz)*nz;if(relative<0){const impulse=relative*.73;a.vx+=impulse*nx;a.vy+=impulse*ny;a.vz+=impulse*nz;b.vx-=impulse*nx;b.vy-=impulse*ny;b.vz-=impulse*nz;}
        }
      }
      for(const b of this.balls){const distance=Math.hypot(b.x,b.y,b.z);if(distance>156){const nx=b.x/distance,ny=b.y/distance,nz=b.z/distance;b.x=nx*156;b.y=ny*156;b.z=nz*156;const outward=b.vx*nx+b.vy*ny+b.vz*nz;if(outward>0){b.vx-=1.5*outward*nx;b.vy-=1.5*outward*ny;b.vz-=1.5*outward*nz;}}}
    }
  }
}
