export default class AudioVowelProcessFormant{
    constructor(){
        this.LPC_ORDER = 64;
        this.samplingRate=44100;
        this.bufferSize=1024;
        this.th_volume = 0.00001;
        this.th_volume_above = 0.0001;
        this.th_volume_under = 0.000001;
        this.VOWEL_WINDOW = 20;
        this.pre_behavior = 'n';
        this.th_isSpeaking = 0.10;
        this.vowelhist = new Array(this.VOWEL_WINDOW);
        this.vowelhist.fill(0); 
        this.lockingBehavior = false;       
        this.vowelresult = console.log;
        this.actionstart = console.log;
        this.timer_isSpeaking = null;
        this.get_volume = console.log;
    }

    analyzeAudioData = buffer => analyzeData(buffer,this);
    set_result = vowelresult => this.vowelresult = vowelresult;
    set_actionstart = actionstart => this.actionstart = actionstart;
    set_result_volume = volume =>this.get_volume = volume;
}

function analyzeData(buffer,AudioVowelProcess){
    const df = AudioVowelProcess.samplingRate / AudioVowelProcess.bufferSize;
    let vol = volume(buffer)
    AudioVowelProcess.get_volume(vol);
    let v;
  
    if(vol < AudioVowelProcess.th_volume){
        v = -1;
        AudioVowelProcess.th_volume_under = AudioVowelProcess.th_volume_under * 0.99 + vol * 0.01;
        AudioVowelProcess.th_volume = AudioVowelProcess.th_volume_under * 0.85 + AudioVowelProcess.th_volume_above * 0.15;
    }else{
        let f = extract_formant(buffer,df,AudioVowelProcess.LPC_ORDER,AudioVowelProcess.bufferSize);
        v = vowel(f[0],f[1]);
        AudioVowelProcess.th_volume_above = AudioVowelProcess.th_volume_above * 0.99 + vol * 0.01;
        AudioVowelProcess.th_volume = AudioVowelProcess.th_volume_under * 0.85 + AudioVowelProcess.th_volume_above * 0.15;
    }
         
    AudioVowelProcess.vowelhist.shift();
    if( v  >= 0){
        AudioVowelProcess.vowelhist.push(v);
    }else{
        AudioVowelProcess.vowelhist.push(-1);
    }
    
    let count = AudioVowelProcess.vowelhist.filter(function(x){return x >= 0}).length;
    let ave = count / AudioVowelProcess.vowelhist.length;
  
    let _v = 'n';
    if(ave > AudioVowelProcess.th_isSpeaking){
      _v = getVowelLabel(v);
      //AudioVowelProcess.actionstart("start");

      if(AudioVowelProcess.timer_isSpeaking){
            clearTimeout(AudioVowelProcess.timer_isSpeaking);
            AudioVowelProcess.timer_isSpeaking = null;
       }      
       AudioVowelProcess.timer_isSpeaking = setTimeout(()=>{
            //AudioVowelProcess.actionstart("stop");
            AudioVowelProcess.timer_isSpeaking = null;
            AudioVowelProcess.vowelresult("N");
        },1500);

      if(AudioVowelProcess.pre_behavior !=_v && !AudioVowelProcess.lockingBehavior){
        AudioVowelProcess.vowelresult(_v);
        AudioVowelProcess.lockingBehavior=true;
        AudioVowelProcess.pre_behavior = _v;
        setTimeout(()=>AudioVowelProcess.lockingBehavior=false,200);
        
      }
      
    }

}


function extract_formant(data,df,LPC_ORDER,bufferSize){
    const hamming_result = normalize(hamming(data,bufferSize));
    const lpc_result = normalize(lpc(hamming_result,LPC_ORDER, df));
    const formant_result = formant(lpc_result, df);
    return formant_result;
}


/// fft関係
// 参考：https://qiita.com/bellbind/items/ba7aa07f6c915d400000

function expi(theta) {
    return [Math.cos(theta), Math.sin(theta)];
}
function iadd([ax, ay], [bx, by]) {
    return [ax + bx, ay + by];
}
function isub([ax, ay], [bx, by]) {
    return [ax - bx, ay - by];
}
function imul([ax, ay], [bx, by]) {
    return [ax * bx - ay * by, ax * by + ay * bx];
}
function isum(cs) {
    return cs.reduce((s, c) => iadd(s, c), [0, 0]);
}

function dftc(c, T) {
    return [...Array(c.length).keys()].map(i => isum(
        c.map((cn, n) => imul(cn, expi(T * n * i)))
    ));
}

function dft(f) {
    const N = f.length, T = -2 * Math.PI / N;
    return dftc(f, T);
}
function idft(F) {
    const N = F.length, T = 2 * Math.PI / N;
    return dftc(F, T).map(([r, i]) => [r / N, i / N]);
}

function toBin(k) {
    return n => n.toString(2).padStart(k, "0");
}

function revBit(k, n) {
    let r = 0;
    for (let i = 0; i < k; i++) r = (r << 1) | ((n >>> i) & 1);
    return r;
}
function reorder(c, N = c.length) {
    const k = Math.log2(N);
    return c.map((_, i) => c[revBit(k, i)]);
}

function fftrec(c, T, N, s = 0, w = 1) {
    if (N === 1) return [c[s]];
    const Nh = N / 2, Td = T * 2, wd = w * 2;
    const rec = fftrec(c, Td, Nh, s, wd).concat(fftrec(c, Td, Nh, s + w, wd));
    for (let i = 0; i < Nh; i++) {
        const l = rec[i], re = imul(rec[i + Nh], expi(T * i));
        [rec[i], rec[i + Nh]] = [iadd(l, re), isub(l, re)];
    }
    return rec;
}

function fft0(f) {
    const N = f.length, T = -2 * Math.PI / N;
    return fftrec(f, T, N);
}
function ifft0(F) {
    const N = F.length, T = 2 * Math.PI / N;
    return fftrec(F, T, N).map(([r, i]) => [r / N, i / N]);
}

function fftin1(c, T, N) {
    var k = Math.log2(N);
    var rec = c.map((_, i) => c[revBit(k, i)]);
    for (var Nh = 1; Nh < N; Nh *= 2) {
        T /= 2;
        for (var s = 0; s < N; s += Nh * 2) {
            for (var i = 0; i < Nh; i++) {
                var l = rec[s + i], re = imul(rec[s + i + Nh], expi(T * i));
                [rec[s + i], rec[s + i + Nh]] = [iadd(l, re), isub(l, re)];
            }
        }
    }
    return rec;
}

function fft1(f) {
    const N = f.length, T = -2 * Math.PI;
    return fftin1(f, T, N);
}
function ifft1(F) {
    const N = F.length, T = 2 * Math.PI;
    return fftin1(F, T, N).map(([r, i]) => [r / N, i / N]);
}


////
//  フォルマント抽出関係

function volume(data){
    let v = 0.0;
    data.forEach(function(x){
	v += (x*x)/data.length;
    });
    return v;
}

function freqz(b,a,df,N){
    let size_a = a.length;
    let size_b = b.length;
    let s = 2;

    let h = new Array(0);
    let la = new Array(0);
    let lb = new Array(0);
    for(let i=0;i<s*N;i++){
	if( i >= size_a ){
	    la.push(0);
	}
	else{
	    la.push(a[i]);
	}
	if( i >= size_b ){
	    lb.push(0);
	}
	else{
	    lb.push(b[i]);
	}
    }
    let fft_a = fft1(la.map(r=>[r,0]));
    let fft_b = fft1(lb.map(r=>[r,0]));
    let fft_a1 = fft_a.map(([s,t])=>(Math.sqrt(s**2+t**2)));
    
    let fft_b1 = fft_b.map(([s,t])=>(Math.sqrt(s**2+t**2)));
    for(let i=0;i<N;i++){
	h.push(fft_b1[i]/fft_a1[i]);
    }
    return h;
}

function normalize(data){
    let max = Math.max.apply([],data);
    let min = Math.min.apply([],data);
    let factor = Math.abs(max) > Math.abs(min) ? Math.abs(max) : Math.abs(min);
    return data.map(function(d){
	return d / factor;
    });

}

function hamming(data,bufferSize){
    let ret = new Array(bufferSize);
    ret = data.map(function(d,index){
	return d * (0.54 - 0.46 * Math.cos(2 * Math.PI * index / (data.length -1)));
    });
    ret[0] = 0;
    ret[data.length-1] = 0;
    return ret;
}

function lpc(data,order,df){
    const N = data.length;

    const lags_num = order + 1;
    let r = new Array(lags_num);
    for (let l = 0; l < lags_num; ++l) {
	r[l] = 0.0;
	for (let n = 0; n < N - l; ++n) {
	    r[l] += data[n] * data[n + l];
	}
    }
    
    let a = new Array(order + 1);
    let e = new Array(order + 1);
    a.fill(0.0);
    e.fill(0.0);
    a[0] = e[0] = 1.0;
    a[1] = -r[1] / r[0];
    e[1] = r[0] + r[1] * a[1];
    for (let k = 1; k < order; ++k) {
	let lambda = 0.0;
	for (let j = 0; j < k + 1; ++j) {
	    lambda -= a[j] * r[k + 1 - j];
	}
	lambda /= e[k];

	let U = new Array(k+2);
	let V = new Array(k+2);
	U[0] = 1.0; V[0] = 0.0;
	for (let i = 1; i < k + 1; ++i) {
	    U[i] = a[i];
	    V[k + 1 - i] = a[i];
	}
	U[k + 1] = 0.0; V[k + 1] = 1.0;
	
	for (let i = 0; i < k + 2; ++i) {
	    a[i] = U[i] + lambda * V[i];
	}
	
	e[k + 1] = e[k] * (1.0 - lambda * lambda);
    }
    return freqz(e, a, df, N);
}
function formant(data, df){
    let result = [0.0,0.0];
    let is_find_first = false;
    for (let i = 1; i < data.length - 1; ++i) {
	if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
	    if (!is_find_first) {
		result[0] = df * i;
		is_find_first = true;
	    }
	    else {
		result[1] = df * i;
		break;
	    }
	}
    }
    return result;
}

function vowel(f1,f2){

    let frame_f1_f2 = [
	[ [1200,2000],[1800,2800] ],
	[ [400,1000],[3000,6000] ],
	[ [200,600],[1000,3200] ],
	[ [800,1200],[2000,4800] ],
	[ [500,1500],[900,2000] ] ];
    
    let claster = [ 0,0,0,0,0 ];
    let xm = [ 750,300,350,520,480 ];
    let ym = [ 1180,2200,1100,1900,900 ];
    
    for (let i = 0; i < 5; i++) {
        if ((f1 > frame_f1_f2[i][0][0] && f1<frame_f1_f2[i][0][1]) && (f2>frame_f1_f2[i][1][0] && f2 < frame_f1_f2[i][1][1])) {
            claster[i] = 1;
        }
    }
    let distance = 99999;
    let ans = -1;
    for (let i = 0; i < 5; i++) {
        if (claster[i] == 1) {
            if (Math.sqrt((f1 - xm[i])*(f1 - xm[i]) + (f2 - ym[i])*(f2 - ym[i])) < distance) {
            distance = Math.sqrt((f1 - xm[i])*(f1 - xm[i]) + (f2 - ym[i])*(f2 - ym[i]));
            ans = i;
            }
        }
    }
    return ans;
}

function getVowelLabel(v){
    let _v = 'n';
    if(v == 0) _v = 'a';
    if(v == 1) _v = 'i';
    if(v == 2) _v = 'u';
    if(v == 3) _v = 'e';
    if(v == 4) _v = 'o';
    return _v;
  }