export function rollingNoise(sampleRate,seconds=2){
  const samples=new Float32Array(Math.floor(sampleRate*seconds));let previous=0,seed=13057;
  for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/4294967296*2-1;previous=previous*.35+white*.65;samples[i]=previous;}
  return samples;
}
export class SpinAudio{
  constructor(context){
    this.context=context;this.output=context.createGain();this.output.gain.value=0;this.output.connect(context.destination);
    const samples=rollingNoise(context.sampleRate),buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);
    this.noise=context.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
    this.filter=context.createBiquadFilter();this.filter.type='bandpass';this.filter.frequency.value=650;this.filter.Q.value=.55;
    this.noise.connect(this.filter);this.filter.connect(this.output);
    this.hum=context.createOscillator();this.hum.type='triangle';this.hum.frequency.value=65;this.humGain=context.createGain();this.humGain.gain.value=.12;this.hum.connect(this.humGain);this.humGain.connect(this.output);
    this.pulse=context.createOscillator();this.pulse.frequency.value=14;this.pulseGain=context.createGain();this.pulseGain.gain.value=230;this.pulse.connect(this.pulseGain);this.pulseGain.connect(this.filter.frequency);
    this.noise.start();this.hum.start();this.pulse.start();this.lastClack=0;this.stopped=false;
  }
  speed(value){
    if(this.stopped)return;const c=this.context,t=c.currentTime,s=Math.max(0,Math.min(value,12));
    this.output.gain.setTargetAtTime(s>.02?.17+.10*Math.sqrt(s/11):0,t,.055);this.filter.frequency.setTargetAtTime(300+s*80,t,.05);this.hum.frequency.setTargetAtTime(42+s*10,t,.05);this.pulse.frequency.setTargetAtTime(9+s*2.7,t,.05);
    if(s>.1&&t-this.lastClack>Math.max(.065,.24-s*.014)){this.lastClack=t;const click=c.createBufferSource(),gain=c.createGain();click.buffer=this.noise.buffer;const high=c.createBiquadFilter();high.type='highpass';high.frequency.value=1250;gain.gain.setValueAtTime(.12+s*.012,t);gain.gain.exponentialRampToValueAtTime(.001,t+.055);click.connect(high);high.connect(gain);gain.connect(c.destination);click.start(t,(t*7)%1);click.stop(t+.06);}
  }
  stop(){if(this.stopped)return;this.stopped=true;const t=this.context.currentTime;this.output.gain.setTargetAtTime(0,t,.04);for(const node of [this.noise,this.hum,this.pulse])node.stop(t+.2);setTimeout(()=>{this.output.disconnect();this.filter.disconnect();this.humGain.disconnect();this.pulseGain.disconnect();},350);}
}
