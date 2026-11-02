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
    const duration=Math.min(Math.max(dt,0),1/15),omega=typeof mixing==='number'?mixing:mixing?2.5:0;
    const steps=Math.max(1,Math.ceil(duration*120)),h=duration/steps;
    for(let sub=0;sub<steps;sub++){
      this.angle+=h*omega;
      const cos=Math.cos(this.angle),sin=Math.sin(this.angle),drag=Math.exp(-.16*h);
      for(const b of this.balls){
        b.vy-=680*h;b.vx*=drag;b.vy*=drag;b.vz*=drag;
        const speed=Math.hypot(b.vx,b.vy,b.vz);if(speed>780){b.vx*=780/speed;b.vy*=780/speed;b.vz*=780/speed;}
        b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;b.rotation+=Math.hypot(b.vx,b.vz)*h*.025;
      }
      for(let pass=0;pass<3;pass++){
        for(let i=0;i<this.balls.length;i++)for(let j=i+1;j<this.balls.length;j++){
          const a=this.balls[i],b=this.balls[j],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz);
          if(d<32&&d>.0001){
            const nx=dx/d,ny=dy/d,nz=dz/d,overlap=(32-d)*.505;
            a.x-=nx*overlap;a.y-=ny*overlap;a.z-=nz*overlap;b.x+=nx*overlap;b.y+=ny*overlap;b.z+=nz*overlap;
            const rvx=b.vx-a.vx,rvy=b.vy-a.vy,rvz=b.vz-a.vz,normal=rvx*nx+rvy*ny+rvz*nz;
            if(normal<0){const impulse=normal*(Math.abs(normal)>25?.74:.5);a.vx+=impulse*nx;a.vy+=impulse*ny;a.vz+=impulse*nz;b.vx-=impulse*nx;b.vy-=impulse*ny;b.vz-=impulse*nz;
              const tx=(rvx-normal*nx)*.018,ty=(rvy-normal*ny)*.018,tz=(rvz-normal*nz)*.018;a.vx+=tx;a.vy+=ty;a.vz+=tz;b.vx-=tx;b.vy-=ty;b.vz-=tz;
            }
          }
        }
        for(const b of this.balls){
          // Gravity stays in world space. Only contact with moving metal transfers rotation.
          for(const side of [-1,1]){
            const lx=b.x,ly=b.y*cos+b.z*sin,lz=-b.y*sin+b.z*cos;
            const qx=Math.max(-112.5,Math.min(112.5,lx)),qy=Math.max(side*149-3,Math.min(side*149+3,ly)),qz=Math.max(-13.5,Math.min(13.5,lz));
            let dx=lx-qx,dy=ly-qy,dz=lz-qz,d=Math.hypot(dx,dy,dz);
            if(d<16){if(d<.0001){dy=-side;dx=0;dz=0;d=1;}const nx=dx/d,ny=(dy*cos-dz*sin)/d,nz=(dy*sin+dz*cos)/d,penetration=16-d;
              b.x+=nx*penetration;b.y+=ny*penetration;b.z+=nz*penetration;
              this.surfaceContact(b,nx,ny,nz,omega,.46,.20,h);
            }
          }
          const distance=Math.hypot(b.x,b.y,b.z);
          if(distance>156){const nx=-b.x/distance,ny=-b.y/distance,nz=-b.z/distance;b.x=-nx*156;b.y=-ny*156;b.z=-nz*156;this.surfaceContact(b,nx,ny,nz,omega,.20,.32,h);}
        }
      }
    }
  }
  surfaceContact(b,nx,ny,nz,omega,friction,restitution,dt){
    const wallY=-omega*b.z,wallZ=omega*b.y,rvx=b.vx,rvy=b.vy-wallY,rvz=b.vz-wallZ,normal=rvx*nx+rvy*ny+rvz*nz;
    if(normal<0){const bounce=Math.abs(normal)<30?0:restitution,impulse=-(1+bounce)*normal;b.vx+=impulse*nx;b.vy+=impulse*ny;b.vz+=impulse*nz;
      const tx=rvx-normal*nx,ty=rvy-normal*ny,tz=rvz-normal*nz,tangent=Math.hypot(tx,ty,tz);
      if(tangent>.001){const grip=Math.min(tangent,friction*(impulse+680*dt)) / tangent;b.vx-=tx*grip;b.vy-=ty*grip;b.vz-=tz*grip;}
    }
  }
}
