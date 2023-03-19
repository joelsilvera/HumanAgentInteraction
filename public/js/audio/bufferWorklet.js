class bufferWorklet extends AudioWorkletProcessor {
    
	constructor(){
		super();
		this.bufferStack = [];
		this.voicechange = false;
		this.intensity = 100;
    }

    process(inputs,outputs,parameters){
		let input = inputs[0];
		let output = outputs[0];
		if(input[0]){
			if(input.length==1){
				for(let i=0;i<input[0].length;i++){
					output[0][i] = input[0][i];
					this.bufferStack.push(input[0][i]);
				}		
			}
			else if(input.length==2){
				for(let i=0;i<input[0].length;i++){
					output[0][i] = input[0][i];
					output[1][i] = input[1][i];
					this.bufferStack.push((input[0][i] + input[1][i])/2);
				}
			}
			if(this.bufferStack.length >=1024){
				this.port.postMessage({
					buffer: this.bufferStack
				});
				this.bufferStack.length = 0;
			}
		}
		
		return true;
    }

}

registerProcessor('bufferWorklet',bufferWorklet);