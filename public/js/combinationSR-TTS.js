const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

const synth = window.speechSynthesis;
let numero_pregunta =0;
let voices = [];
window.voices = voices
function populateVoiceList() {
    voices = synth.getVoices();
}

populateVoiceList();


let pregunta = ["¿Te gusta el sushi?", "¿Te gusta el color rosa?","¿Eres o no eres?","¿Te gusta bing?"]

window.populatevoice = populateVoiceList;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'es-ES';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

const recognition2 = new SpeechRecognition();
recognition2.continuous = false;
recognition2.lang = 'es-ES';
recognition2.interimResults = false;
recognition2.maxAlternatives = 1;

let usuario = window.location.href.split("/").slice(-1)[0];

let comenzar_hablar = document.getElementById("convertirVoz");

let comenzar_hablar2 = document.getElementById("convertirVoz2");

let estado = "preguntando_nombre";
let nombre = "";

let respuestas_positivas = ["sí","si","claro","por supuesto","me gusta mucho","me encanta","me fascina","me enloquece"];
let respuestas_negativas = ["no","no lo entiendo","lo detesto","lo odio", "me aburre", "me estresa", "no me gusta"];

let comentario_positivo = ["genial","excelente","a mi también","Que onda wey","¡Fantástico!","¡Estupendo!"];
let comentario_negativo = ["oh, que pena","ni modo", "es una lástima","¿Cómo es posible?","entiendo"];

let empezar_recognition  = () =>{
  recognition.start();
}

let empezar_recognition_2 = ()=>{
  recognition2.start();
}

recognition2.onresult = (event) =>{
    let comando_recibido = event.results[0][0].transcript;
    console.log("enviando :",comando_recibido);
    ws.send(JSON.stringify({"command":"send_message","message":comando_recibido,usuario}));  
}

comenzar_hablar.onclick = () => {
    populateVoiceList();
    comenzar_hablar.disabled = true;
    hacer_hablar_pc("hola mi nombre es agente uno ¿Cuál es tu nombre?",empezar_recognition);
};

comenzar_hablar2.onclick = () => {
  if(comenzar_hablar2.innerText=="Mandar"){
    comenzar_hablar2.innerText = "hablando...";
    populateVoiceList();
    empezar_recognition_2();
  }
  else{
    comenzar_hablar2.innerText = "Mandar";
    recognition2.stop();
  }
};  

window.recognition2  = recognition2;

  recognition.onresult = (event) => {
    comenzar_hablar2.innerText = "Mandar";
    let comando_recibido = event.results[0][0].transcript;

    switch(estado){
      case "preguntando_nombre":
        let palabras = comando_recibido.split(" ");
        let nombre = palabras[palabras.length-1];
        hacer_hablar_pc("hola "+ nombre + " ¿Te gusta el curso de interacción humano agente?",empezar_recognition);

        estado = "respuesta_a_la_pregunta";
      break;
      case "respuesta_a_la_pregunta":
        comando_recibido = comando_recibido.toLowerCase();
        let positivo = respuestas_positivas.map((valor)=>comando_recibido.includes(valor))
        let negativo = respuestas_negativas.map((valor)=>comando_recibido.includes(valor))
        let resultado_positivo = false;
        let resultado_negativo = false;

        positivo.map((valor)=>resultado_positivo=resultado_positivo  || valor)
        negativo.map((valor)=>resultado_negativo=resultado_negativo  || valor)
        
        
        let pregunta_actual = pregunta[numero_pregunta]
        
        if(resultado_negativo)  
          setTimeout(()=>{
            let comentario = comentario_negativo[Math.floor(Math.random()*comentario_negativo.length)]
            hacer_hablar_pc(comentario,()=>hacer_hablar_pc(pregunta_actual,empezar_recognition))
          },2000);

        if(resultado_positivo)
        setTimeout(()=>{
          let comentario = comentario_positivo[Math.floor(Math.random()*comentario_positivo.length)]
            hacer_hablar_pc(comentario,()=>hacer_hablar_pc(pregunta_actual,empezar_recognition));
          },2000);
        numero_pregunta++;
      break;
      default:
          console.log("No estado");
      break;


    }



    }

  recognition.onspeechend = () => {
    comenzar_hablar2.innerText = "Mandar";
    recognition.stop();
  }

  recognition.onnomatch = (event) => {
    diagnostic.textContent = "I didn't recognize that color.";
  }

  recognition.onerror = (event) => {
    console.log('Speech recognition error detected: ' + event.error);
    console.log('Additional information: ' + event.message);
  }

  let is_speaking = false;
  let openning_mouth = true;

  function speak_randomly(x,y,time){
    
    if(y<1 && openning_mouth ){
      y+=0.2;
    }
    else if(openning_mouth){
      openning_mouth=false;
      y-=0.2;
    }
    else if(y>0 && !openning_mouth){
      y-=0.2;
    }
    else{
      y+=0.2;
      openning_mouth=true;
    }

    mover_boca(x,y);

    if(is_speaking)
      setTimeout(()=>{speak_randomly(x,y,time)},time);
      
  }

  function hacer_hablar_pc(text,callback){
    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.audioDestination = audioprocess.mediastreamdestination.stream;

    utterThis.onstart = () =>{
        is_speaking = true;
        speak_randomly(0,0,30);
    }


    for (const voice of voices) {
        if (voice.name === "Google español") {
          utterThis.voice = voice;
        }
      }
    utterThis.pitch = 0.7;
    utterThis.rate = 1.0;
    synth.speak(utterThis); 
    utterThis.onend = () =>{
      is_speaking = false;   
      setTimeout(()=>mover_boca(0,0,100),200);
      callback();
    
    };


  }

  let prefix_websocket = "ws://";
  if( window.location.protocol=="https:")
    prefix_websocket= "wss://";

  let ws = new WebSocket(prefix_websocket+window.location.host+"/command")
  ws.onopen = e => {
		ws.send(JSON.stringify({"registro":usuario}))
	}
	ws.onerror = error => {
		
	}

	ws.onmessage = e => {
    let received_data = safelyParseJSON(e.data);
    hacer_hablar_pc(received_data.message,()=>console.log("ok"))
	};

	ws.onclose = e => {
	};

  const safelyParseJSON = (json) => {
    let parsed = "";
  
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      console.trace("there is an error on JSON: " + json);
    }
  
    return parsed;
  }
  
  setTimeout(
  ()=>{
    populateVoiceList();
    hacer_hablar_pc("hola",()=>console.log("ok"))
  },
   5000)
  

  window.ws = ws;