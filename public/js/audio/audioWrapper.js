import AudioVowelProcessFormant from "./AudioVowelProcessFormant.js";

export default class AudioProcess{
    constructor(){
        this.context = new AudioContext();
        this.formant = new AudioVowelProcessFormant();
        this.mediastreamsource = "";
        this.delayNode = "";
        this.delayGain = "";
        this.voices = [];
        this.mediastreamdestination = this.context.createMediaStreamDestination();
    }
    startBufferAnalysis = ()=>this.startBufferAnalysis();
    get_vowel = vowelresult => this.formant.set_result(vowelresult);
    
    
    
    connectSynth = (synth)=>{       
      console.log(synth);  
      const source = this.context.createMediaStreamSource(synth.getOutput());
      source.connect(this.mediastreamdestination);
      }
      

      startBufferAnalysis=()=>{
        //here, the place it is absolute and not relative. So, it is needed to add "js/audio"
        const mediaStreamSource = this.context.createMediaStreamSource(this.mediastreamdestination.stream);
        const gainNode =  this.context.createGain();
        mediaStreamSource.connect(gainNode);
        gainNode.connect( this.context.destination);

        this.context.audioWorklet.addModule('./js/audio/bufferWorklet.js').then(() => {
          this.bufferWorkLet = new AudioWorkletNode(this.context, 'bufferWorklet');
          this.bufferWorkLet.port.onmessage = (event)=>{
            this.formant.analyzeAudioData(event.data.buffer);
          };    
          mediaStreamSource.connect(this.bufferWorkLet);
        })
  }    
}