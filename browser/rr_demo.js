// Demo for repeat_remove
// License: WTFPL

"use strict";

function nodrop(e){
  e = (e||event);
  if(e.target&&!e.target.disabled){
    if(e.target.tagName=='INPUT')
      if(e.target.files)
        return true;
  }
  e.preventDefault();
  if(e.dataTransfer){
    e.dataTransfer.effectAllowed = 'none';
    e.dataTransfer.dropEffect = 'none';
  }
  return false;
};

function GEBI(id){
  return document.getElementById(id);
};

window.addEventListener('dragover',nodrop,false);
window.addEventListener('drop',nodrop,false);
var myfile = GEBI('myfile');
var myaudio_src = GEBI('myaudio_src');
var myaudio_out = GEBI('myaudio_out');
var myaudio_loop = GEBI('myaudio_loop');
var mycaption_src = GEBI('mycaption_src');
var mycaption_out = GEBI('mycaption_out');
var mycaption_loop = GEBI('mycaption_loop');
var myrunbrowser = GEBI('myrunbrowser');
var myrunbworker = GEBI('myrunbworker');
var myconsole = GEBI('myconsole');
var myuseraw = GEBI('myuseraw');
var myusebrowser = GEBI('myusebrowser');
var myuseaurora = GEBI('myuseaurora');
var myuseclear = GEBI('myuseclear');
var myrunabort = GEBI('myrunabort');

var source_name = '';
var source_blob = null;
var output_name = '';
var output_blob = null;
var repeat_name = '';
var repeat_blob = null;

var curr_file = null;
var curr_name = '';

var worker = null;

function clearfile(){
  myfile.value = '';
  fileopened();
  tryfile();
};

function tryfile(disable){
  var file = myfile.files[0];
  var valid = file&&file.size;
  var dis = !valid||disable;
  myuseraw.disabled = dis;
  myusebrowser.disabled = dis;
  myuseaurora.disabled = dis;
  myuseclear.disabled = dis;
  if(valid){
    curr_file = file;
    curr_name = file.name;
  }else{
    curr_file = null;
    curr_name = '';
  }
};

function usesource(audio,src,type,h2,name){
  audio.innerHTML = '';
  if(src){
    var source = document.createElement('source');
    if(type)
      source.type = type;
    source.src = src;
    audio.appendChild(source);
    var e = document.createElement('a');
    e.href = src;
    e.download = name;
    e.textContent = name;
    e.title = 'Save as...';
    h2.innerHTML = '';
    h2.appendChild(e);
  }else{
    h2.textContent = name;
  }
  audio.load();
};

function fileopened(blob,name){
  abortworker(true);
  usesource(myaudio_src,null,null,mycaption_src,'<source>');
  if(source_blob)
    URL.revokeObjectURL(source_blob);
  if(blob){
    source_name = name;
    source_blob = URL.createObjectURL(blob);
    usesource(myaudio_src,source_blob,'audio/wav',mycaption_src,source_name);
  }else{
    source_blob = null;
    source_name = '';
  }
};

function UrlToBlob(url,cb){
  var xhr = new XMLHttpRequest();
  xhr.open('GET',url,true);
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    if(this.status == 200){
      cb(this.response);
    }
  };
  xhr.send();
};


function abortworker(clear,disable){
  if(worker)
    worker.terminate();
  if(window.repeat_remove){
    window.repeat_remove({action:'abort'});
  }
  worker = null;
  myconsole.disabled = false;
  myrunbrowser.disabled = disable;
  myrunworker.disabled = disable;
  myrunabort.disabled = true;
  myfile.disabled = disable;
  tryfile(disable);
  if(clear){
    if(output_blob)
      URL.revokeObjectURL(output_blob);
    output_blob = null;
    output_name = '';
    if(repeat_blob)
      URL.revokeObjectURL(repeat_blob);
    repeat_blob = null;
    repeat_name = '';
    usesource(myaudio_out,null,null,mycaption_out,'<output>');
    usesource(myaudio_loop,null,null,mycaption_loop,'<repeat>');
  }
};

function wantconvert(useworkers){
  abortworker(true);
  myconsole.value = '';
  myconsole.disabled = true;
  myrunbrowser.disabled = true;
  myrunworker.disabled = true;
  myrunabort.disabled = false;
  myfile.disabled = true;
  myuseraw.disabled = true;
  myusebrowser.disabled = true;
  myuseaurora.disabled = true;
  myuseclear.disabled = true;
  var onmessage = function(y) {
    switch(y.data.action){
    case 'log':
      myconsole.value += y.data.text;
      return;
    case 'done':
      var res = y.data.res;
      if(res&&res.length==2&&res[0]&&res[1]){
        UrlToBlob(res[0].blob,function(b1){
          UrlToBlob(res[1].blob,function(b2){
            output_name = res[0].name;
            output_blob = URL.createObjectURL(b1);
            repeat_name = res[1].name;
            repeat_blob = URL.createObjectURL(b2);
            usesource(myaudio_out,output_blob,b1.type,mycaption_out,res[0].name);
            usesource(myaudio_loop,repeat_blob,b2.type,mycaption_loop,res[1].name);
            abortworker();
          });
        });
      }else
        abortworker();
      return;
    }
  };
  var data = {
      action: 'start', 
      url: source_blob,
      name: source_name,
    };
  setTimeout(function(){
    if(useworkers){
      worker = new Worker('rr_ww.js');
      worker.onmessage = onmessage;
      worker.postMessage(data);
    }else{
      try{
        window.repeat_remove(data,onmessage);
      }catch(e){}
    }
  },20);
};

clearfile();
setTimeout(wantconvert,1);

myfile.addEventListener('change',function(){
  tryfile();
});

myrunbrowser.addEventListener('click',function(e){
  wantconvert(false);
});

myrunworker.addEventListener('click',function(e){
  wantconvert(true);
});


myuseraw.addEventListener('click',function(){
  if(!curr_file)
    return;
  fileopened(curr_file,curr_name);
});

myusebrowser.addEventListener('click',function(){
  if(!curr_file)
    return;
  abortworker(true,true);
  mycaption_src.textContent = '<Converting...>';
  setTimeout(function(){
    convert_browser(curr_file,function(err,blob){
      if(err||!blob){
        mycaption_src.textContent = '<ERROR!>';
        if(err)
          console.error(err);
        return tryfile();
      }
      fileopened(blob,curr_name+'.browser.wav');
    });
  },20);
});

myuseaurora.addEventListener('click',function(){
  if(!curr_file)
    return;
  abortworker(true,true);
  mycaption_src.textContent = '<Converting...>';
  setTimeout(function(){
    convert_aurora(curr_file,function(err,blob){
      if(err||!blob){
        mycaption_src.textContent = '<ERROR!>';
        if(err)
          console.error(err);
        return tryfile();
      }
      fileopened(blob,curr_name+'.aurora.wav');
    });
  },20);
});

myuseclear.addEventListener('click',clearfile);
myrunabort.addEventListener('click',abortworker);

function convert_browser(file,cb){
  var FR = new FileReader();
  FR.onload = function(event) {
    next(event.target.result);
  };
  FR.readAsArrayBuffer(file);
  function next(buffer){
    var chunks;
    try{
      var AC = new (window.AudioContext||window.webkitAudioContext)();
      AC.decodeAudioData(buffer,function(audio){
        var rate = audio.sampleRate;
        var samples = audio.length;
        var stereo = audio.numberOfChannels>1;
        var left = audio.getChannelData(0);
        var right = stereo ? audio.getChannelData(1) : null;
        chunks = [new ArrayBuffer(44)];
        chunks.push(audio2pcm(left,right));
        waveheader(chunks[0],stereo,true,samples,rate);
        var blob = new Blob(chunks,{type:'audio/wav'});
        chunks = null;
        left = null;
        right = null;
        cb(null,blob);
      },function(e){
        chunks = null;
        cb(e,null);
      });
    }catch(e){
      chunks = null;
      cb(e,null);
    }
  }
};

function convert_aurora(file,cb){
  var current;
  var chunks;
  var AV;
  var AS;
  try{
    var samples = 0;
    var from;
    var rate = 44100;
    var stereo = true;
    AV = window.AV;
    AS = AV.Asset.fromFile(file);
    chunks = [new ArrayBuffer(44)];
    current = null;
    AS.on('format',function(format){
      rate = format.sampleRate||rate;
      stereo = format.channelsPerFrame?(format.channelsPerFrame>1):stereo;
    });
    AS.on('data',function(array){
      try{
        samples += array.length;
        var size;
        while(array){
          if(!current){
            current = new Int16Array(256*1024);
            from = 0;
          }
          size = current.length-from;
          if(array.length>=size){
            float2pcm(array,current,from,size);
            chunks.push(current);
            current = null;
            if(array.length>size)
              array = array.subarray(size);
            else
             array = null;
          }else{
            from = float2pcm(array,current,from,array.length);
            array = null;
          }
        }
      }catch(e){
        chunks = null;
        current = null;
        AS = null;
        cb(e,null);
      }
    });
    AS.on('error',function(e){
      chunks = null;
      current = null;
      AS = null;
      cb(e,null);
    });
    AS.on('end',function(e){
      if(current)
        chunks.push(current.subarray(0,from));
      waveheader(chunks[0],stereo,true,stereo?samples>>1:samples,rate);
      var blob = new Blob(chunks,{type:'audio/wav'});
      chunks = null;
      current = null;
      AS = null;
      cb(null,blob);
    });
    AS.start();
  }catch(e){
    chunks = null;
    current = null;
    AS = null;
    cb(e,null);
  }
};

function float2pcm(array,result,offset,size){
  for(var i=0,s; i<size; i++)
    result[offset++] = (s=array[i])<0 ? (s<-1?-1:s)*0x8000 : (s>1?1:s)*0x7fff;
  return offset;
};

function audio2pcm(left,right){
  var size = left.length;
  var result;
  if(right){
    result = new Int16Array(size*2);
    for(var i=0,j=0,s; i<size; i++){
      result[j++] = (s=left[i])<0 ? (s<-1?-1:s)*0x8000 : (s>1?1:s)*0x7fff;
      result[j++] = (s=right[i])<0 ? (s<-1?-1:s)*0x8000 : (s>1?1:s)*0x7fff;
    }
  }else{
    result = new Int16Array(size);
    for(var i=0,s; i<size; i++)
      result[i] = (s=left[i])<0 ? (s<-1?-1:s)*0x8000 : (s>1?1:s)*0x7fff;
  }
  return result;
};

function waveheader(header,stereo,bit16,samples,rate){
  var view = new DataView(header);
  var chan = stereo?2:1;
  var bytes = bit16?2:1;
  writeString(0,'RIFF');
  view.setUint32(4,36+samples*chan*bytes,true);
  writeString(8,'WAVE');
  writeString(12,'fmt ');
  view.setUint32(16,16,true);
  view.setUint16(20,1,true);
  view.setUint16(22,chan,true);
  view.setUint32(24,rate,true);
  view.setUint32(28,rate*chan*bytes,true);
  view.setUint16(32,chan*bytes,true);
  view.setUint16(34,8*bytes,true);
  writeString(36,'data');
  view.setUint32(40,samples*chan*bytes,true);
  function writeString(offset,string){
    for(var i=0,n=string.length; i<n; i++)
      view.setUint8(offset++,string.charCodeAt(i));
  };
};

window.my_loaded_demo = true;
//EOF