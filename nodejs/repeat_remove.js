// repeat_remove.js v1.2, by Kly_Men_COmpany!
// License: WTFPL

/*
  NodeJS / WebWorkers port of repeat_remove.c
  To build for browser native, replace
    <"async";> with <async >
    <"await",> with <await >
  and use Babel if needed.
*/

"use strict";

(function(){

var fs;
var util;
var node = true;
var browser = false;
var MY_ENVIRONMENT = 'NodeJS';
var mypostMessage;

if((typeof module)!=='undefined' && !module.parent){
  fs = require("fs");
  util = require("util");
  var argv = [];
  var argc;
  for(var i=1; i<process.argv.length; i++)
    argv.push(process.argv[i]);
  argc = argv.length;
  process.exitCode = repeat_remove()(argc,argv);
}else{
  node = false;
  if(self!=self.window){
    MY_ENVIRONMENT = 'WebWorkers';
    self.importScripts("./buffer.js");
    self.Buffer = self.buffer.Buffer;
    repeat_remove();
  }else if(self.window){
    browser = true;
    MY_ENVIRONMENT = 'Browser';
    window.Buffer = window.buffer.Buffer;
    repeat_remove();
  }
}

function repeat_remove(){

if(!node){
  
var fprintf = function(logger){
  var args = Array.prototype.slice.call(arguments);
  var file = args.shift();
  var text = sprintf.apply(null,args);
  logger(text);
};

var fread = function(ptr,size,nmemb,stream){
  stream = stdin;
  var have = Math.min(stream.byteLength,size*nmemb);
  var from = new Uint8Array(stream);
  for(var i=0; i<have; i++)
    ptr[i] = from[i];
  stdin = stream.slice(have);
  return (have/size)|0;
};

var get_file_data = function(
  wave,
  size
){
  if(!size||size<0||size>stdin.byteLength)
    size = stdin.byteLength;
  try{
    wave.buffer = Buffer.from(stdin,stdin.byteOffset,size);
    wave.bytes = size;
  }catch(e){
    wave.bytes = 0;
    wave.buffer = null;    
  }
};

var fopen_count = 0;
var outblobs = [];

var fopen = function(filename,mode){
  if(fopen_count>2)
    return null;
  if(!(fopen_count++))
    return stdin;
  var blob = {
    blob: new Blob([''],{type:'audio/wav'}),
    size: 0,
    name: filename,
  };
  outblobs.push(blob);
  return blob;
};

var fwrite = function(ptr,size,nmemb,stream){
  var have = Math.min(ptr.byteLength,size*nmemb);
  stream.blob = new Blob([stream.blob,ptr.slice(0,have)],{type:'audio/wav'});
  stream.size += have;
  return (have/size)|0;
};

var remove = function(filename){
  return 1;
};

var rename = function(filename){
  return 1;
};

var malloc = function(size){
  try{
    return Buffer.alloc(size);
  }catch(e){
    return null;
  }
};

var stdin = null;
var stdout = function(line){mypostMessage({action:'log',text:line});};
var stderr = stdout;

}else{

var fread = function( // size_t
  ptr, // void*
  size, // size_t
  nmemb, // size_t
  stream // FILE*
){
  try{
    return (fs.readSync(stream,ptr,0,size*nmemb,null)/size)|0;
  }catch(e){
    return 0;
  }
};

var fwrite = function( // size_t
  ptr, // void*
  size, // size_t
  nmemb, // size_t
  stream // FILE*
){
  try{
    return (fs.writeSync(stream,ptr,0,size*nmemb,null)/size)|0;
  }catch(e){
    return 0;
  }
};

var fopen = function( // FILE*
  filename, // const char*
  mode // const char*
){
  try{
    return fs.openSync(filename,mode);
  }catch(e){
    return null;
  }
};

var fclose = function( // int
  stream // FILE*
){
  try{
    fs.closeSync(stream);
    return 0;
  }catch(e){
    return -1;
  }
};

var remove = function( // int
  filename // const char*
){
  try{
    fs.unlinkSync(filename);
    return 0;
  }catch(e){
    return 1;
  }
};

var rename = function( // int
  old, // const char*
  _new // const char*
){
  try{
    fs.renameSync(old,_new);
    return 0;
  }catch(e){
    return 1;
  }
};

var malloc = function( // void*
  size // size_t
){
  try{
    return Buffer.allocUnsafeSlow(size);
  }catch(e){
    return null;
  }
};

var stdin = 0;
var stdout = 1;
var stderr = 2;

var fprintf = function(){
  var args = Array.prototype.slice.call(arguments);
  var file = args.shift();
  var text = sprintf.apply(null,args);
  var buffer = Buffer.from(text,"utf8");
  return fwrite(buffer,1,buffer.length,file);
};

};

function sprintf(){
  var args = Array.prototype.slice.call(arguments);
  var from = ''+args.shift();
  var i = 0;
  return from.replace(/%./g,function(x){
    if(i>=args.length)
      return x;
    switch(x){
      case '%d':
        return +args[i++];
      break;
      case '%s':
        return ''+args[i++];
      break;
      case '%%':
        return '%';
      break;
      default:
        return x;
      break;
    }
  });
};

var memmove = function( // void*
  s1, // void*
  s2, // const void*
  n // size_t
){
  s2.copy(s1,0,0,n);
  return s1;
};

var printf = fprintf.bind(null,stdout);

var fflush = function(file){return;};

var panic_abort = false;

if(browser&&window.Promise){
  fflush = "async";function fflush(file){
    if(panic_abort)
      throw 'abort';
    return "await",new Promise(function(resolve){setTimeout(resolve);});
  };
}
  
var CLOCKS_PER_SEC = 1000;

function clock(){
  return Date.now();  
};

function dpad(
  val,
  num,
  what,
  right
){
  var text = ""+val;
  if(text.length>=num)
    return text;
  var span = what.repeat(num-text.length);
  if(right)
    return text+span;
  return span+text;
};

var ISBE = true;

try{
  var ab = new ArrayBuffer(2);
  var u16 = new Uint16Array(ab,0,1);
  var u8 = new Uint8Array(ab,0,2);
  u8[0] = 0;
  u16[0] = 1;
  if(u8[0])
    ISBE = false;
}catch(e){}

function read_file( // int
  stream, // FILE*
  buffer, // void*
  size // int
){
  var have; // int
  var total = 0; // int
  while(size>0){
    have = fread(buffer,1,size,stream);
    if(have<0)
      break;
    if(!have){
      have = fread(buffer,1,1,stream);
     if(have!=1)
       break;
    }
    total += have;
    buffer = buffer.slice(have);
    size -= have;
  }
  return total;
};

function write_file( // uint
  stream, // FILE*
  buffer, // void*
  size // int
){
  var have; // int
  var total = 0; // uint
  while(size>0){
    have = fwrite(buffer,1,size,stream);
    if(have<0)
      break;
    if(!have){
      have = fwrite(buffer,1,1,stream);
     if(have!=1)
       break;
    }
    total += have;
    buffer = buffer.slice(have);
    size -= have;
  }
  return total;
};

function wave_header(
  member,
  value
){
  var read = ((typeof value)==="undefined");
  switch(member){
    case "riff_header": // char[4]
      return read ? this.slice(0).toString("binary",0,4) : this.slice(0).write(value,0,4,"binary");
    case "wav_size": // int
      return read ? this.readInt32LE(4) : this.writeInt32LE(value,4);
    case "wave_header": // char[4]
      return read ? this.slice(8).toString("binary",0,4) : this.slice(8).write(value,0,4,"binary");
    case "fmt_header": // char[4]
      return read ? this.slice(12).toString("binary",0,4) : this.slice(12).write(value,0,4,"binary");
    case "fmt_chunk_size": // int
      return read ? this.readInt32LE(16) : this.writeInt32LE(value,16);
    case "audio_format": // short
      return read ? this.readInt16LE(20) : this.writeInt16LE(value,20);
    case "num_channels": // short
      return read ? this.readInt16LE(22) : this.writeInt16LE(value,22);
    case "sample_rate": // int
      return read ? this.readInt32LE(24) : this.writeInt32LE(value,24);
    case "byte_rate": // int
      return read ? this.readInt32LE(28) : this.writeInt32LE(value,28);
    case "sample_alignment": // short
      return read ? this.readInt16LE(32) : this.writeInt16LE(value,32);
    case "bit_depth": // short
      return read ? this.readInt16LE(34) : this.writeInt16LE(value,34);
    case "data_header": // char[4]
      return read ? this.slice(36).toString("binary",0,4) : this.slice(36).write(value,0,4,"binary");
    case "data_bytes": // int
      return read ? this.readInt32LE(40) : this.writeInt32LE(value,40);
  }
  return null;
};

function wave_seek(
  member
){
  switch(member){
    case "riff_header":
      return 0;
    case "wav_size":
      return 4;
    case "wave_header":
      return 8;
    case "fmt_header":
      return 12;
    case "fmt_chunk_size":
      return 16;
    case "audio_format":
      return 20;
    case "num_channels":
      return 22;
    case "sample_rate":
      return 24;
    case "byte_rate":
      return 28;
    case "sample_alignment":
      return 32;
    case "bit_depth":
      return 34;
    case "data_header":
      return 36;
    case "data_bytes":
      return 40;
  }
  return -1;
};

function sizeof(
  what
){
  switch(what){
    case "wave_header":
      return 44;
    case "uint":
      return 4;
    case "float":
      return 4;
  }
  return 0;
};

function wave_data(){
  return {
    header: Buffer.alloc(sizeof("wave_header")), // wave_header
    buffer: null, // void*
    length: 0, // int
    bytes: 0, // int
    shift: 0, // int
    rate: 0, // int
    array: null,
    based: null
  };
};

function skip_chunk( // bool
  stream, // FILE*
  head, // wave_header*
  in_header, // void*
  skip // int
){
  var tail = sizeof("wave_header")-(in_header.byteOffset-head.byteOffset); // int
  var temp; // void*
  temp = malloc(skip);
  if(!temp)
    return false;
  if(read_file(stream,temp,skip)!=skip){
    temp = null;
    return false;
  }
  if(skip<tail){
    memmove(
      in_header,
      in_header.slice(skip),
      tail-skip
    );
    memmove(
      in_header.slice(tail-skip),
      temp,
      skip
    );
  }else{
    memmove(
      in_header,
      temp.slice(skip-tail),
      tail
    );
  }
  temp = null;
  return true;
};

function read_header( // bool
  header, // wave_header*
  stream // FILE*
){
  var next; // int
  if(read_file(stream,header,sizeof("wave_header"))!=sizeof("wave_header"))
    return false;
  var oldhead = header;
  header = wave_header.bind(header);
  if(header("riff_header")!="RIFF")
    return false;  
  if(header("wave_header")!="WAVE")
    return false;
  while(header("fmt_header")!="fmt "){
    next = header("fmt_chunk_size");
    if(next<0 || next>1024*1024)
      return false;
    if(next&1)
      next++;
    next += 8;
    if(!skip_chunk(stream,oldhead,oldhead.slice(wave_seek("fmt_header")),next))
      return false;
  }
  while(header("data_header")!="data"){
    next = header("data_bytes");
    if(next<0 || next>1024*1024)
      return false;
    if(next&1)
      next++;
    next += 8;
    if(!skip_chunk(stream,oldhead,oldhead.slice(wave_seek("data_header")),next))
      return false;
  }
  return true;
};

function check_header( // bool
    header, // const wave_header*
    is_stereo, // bool*
    is_16bit, // bool*
    sample_rate, // bool*
    data_bytes // int*
  ){
  var Return = {};
  header = wave_header.bind(header);
  if(header("wav_size")>0 && header("data_bytes")>0)
    if(header("wav_size")<header("data_bytes"))
      return false;
  if(header("fmt_chunk_size")!=16)
    return false;
  if(header("audio_format")!=1)
    return false;
  if(header("num_channels")!=1 && header("num_channels")!=2)
    return false;
  if(header("bit_depth")!=8 && header("bit_depth")!=16)
    return false;
  if(is_stereo)
    Return.is_stereo = header("num_channels")==2;
  if(is_16bit)
    Return.is_16bit = header("bit_depth")==16;
  if(sample_rate)
    Return.sample_rate = header("sample_rate");
  if(data_bytes){
    if(header("data_bytes")>0 && header("data_bytes")<0x7fffffff)
      Return.data_bytes = header("data_bytes");
    else
      Return.data_bytes = -1;
  }
  return Return;
};

function update_header( // int
  header, // wave_header*
  need_samples // int
){
  var bytes; // int
  var is_stereo = true; // bool
  var is_16bit = true; // bool
  var _check_header = check_header(header,is_stereo,is_16bit,null,null);
  if(!_check_header)
    return -1;
  bytes = need_samples;
  if(_check_header.is_stereo)
    bytes <<= 1;
  if(_check_header.is_16bit)
    bytes <<= 1;
  header = wave_header.bind(header);
  header("data_bytes",bytes);
  header("wav_size",bytes+sizeof("wave_header")-8);
  if(header("wav_size")&1)
    header("wav_size",header("wav_size")+1);
  return bytes;
};

function fix_lame( // bool
  wave // wave_data*
){
  var RIFF = "RIFF"; // short
  var FF = "FF"; // short
  var WA = "WA"; // short
  var VE = "VE"; // short
  var size = wave.bytes; // int
  var test; // short*
  var i; // int
  if(size<2048)
    return false;
  size &= ~1;
  size -= 12;
  test = wave.buffer;
  for(i=0; i<1024; i+=2){
    if(
      test.slice(size).toString("binary",0,4)=="RIFF" &&
      test.slice(size+8).toString("binary",0,4)=="WAVE"
    ){
     wave.bytes = size;
     return true;
   }
   size -= 2;
  }
  return false;
}

function print_time( // void
  sample, // int
  rate // int
){
  var sec = (sample/rate)|0; // int
  var min = (sec/60)|0; // int
  var msc = (1.0*(sample%rate)/rate*100000)|0; // int
  sec = (sec%60)|0;
  return sprintf(
    "%d:%s.%s",
    min,
    dpad(sec,2,'0',false),
    dpad(msc,5,'0',false)
  );
};

function read_all( // int
  stream, // FILE*
  buffer // void*[]
){
  var Return = {};
  var parts_array; // void**
  var one_part = 8*1024*1024; // int
  var total_parts = 256; // int
  var bytes; // int
  var result; // int
  var i; // int
  var to_read; // int
  var have_read; // int
  var copy_to; // void*
  var copy_from; // void*
  parts_array = [];
  parts_array.length = total_parts;
  bytes = 0;
  for(i=0; i<total_parts; i++){
    parts_array[i] = malloc(one_part);
    if(!parts_array[i])
      break;
    to_read = one_part;
    have_read = read_file(stream,parts_array[i],to_read);
    bytes += have_read;
    if(have_read!=one_part)
      break;
  }
  copy_to = malloc(bytes);
  if(!copy_to){
    Return.buffer = null;
    for(i=0; i<total_parts; i++)
      if(parts_array[i])
        parts_array[i] = null;
      else
        break;
    parts_array = null;
    Return.result = -bytes;
    return Return;
  }
  Return.buffer = copy_to;
  result = bytes;
  for(i=0; i<total_parts; i++){
    copy_from = parts_array[i];
    if(!copy_from)
      break;
    to_read = one_part;
    if(bytes<one_part)
      to_read = bytes;
    memmove(copy_to,copy_from,to_read);
    copy_to = copy_to.slice(to_read);
    parts_array[i] = null;
    bytes -= to_read;
  }
  parts_array = null;
  Return.result = result;
  return Return;
}

"async";function read_wave( // bool
  wave, // wave_data*
  stream, // FILE*
  logger // FILE*
){
  var known_length; // int
  var is_stereo; // bool
  var is_16bit; // bool
  var time; // char[32]
  var _check_header = check_header(wave.header,true,true,true,true);
  if(!_check_header){
    if(logger){
      fprintf(logger,"Your WAVE is not supported!\n");
      ("await",fflush(logger));
    }
    return false;
  }
  is_stereo = _check_header.is_stereo;
  is_16bit = _check_header.is_16bit;
  wave.rate = _check_header.sample_rate;
  known_length = _check_header.data_bytes;
  if(logger){
    fprintf(
      logger,
      "WAVE: %d bit %s (%d Hz),",
      is_16bit ? 16 : 8,
      is_stereo ? "stereo" : "mono",
      wave.rate
    );
    ("await",fflush(logger));
  }
  if(known_length>0){
    if(node){
      wave.buffer = malloc(known_length);
      if(!wave.buffer){
        if(logger){
          fprintf(logger,"\nOut of memory! (Need %d Mb)\n",known_length>>20);
          ("await",fflush(logger));
        }
        return false;
      }
      wave.bytes = read_file(stream,wave.buffer,known_length);
    }else{
      get_file_data(wave,known_length);
    }
    if(wave.bytes!=known_length){
      if(logger){
        fprintf(
          logger,
          "\nProbably a read error (size should be %d)...\n",
          known_length
        );
        ("await",fflush(logger));
      }
    }
  }else{
    if(logger){
      fprintf(
        logger,
        "\nBad size in RIFF header..."
      );
      ("await",fflush(logger));
    }
    if(node){
      var all = read_all(stream,wave.buffer);
      wave.bytes = all.result;
      wave.buffer = all.buffer;
    }else{
      get_file_data(wave);
    }
    if(wave.bytes<0){
      if(logger){
        fprintf(logger,"\nOut of memory! (Need 2*%d Mb)\n",-wave.bytes);
        ("await",fflush(logger));
      }
      return false;
    }
  }
  if(fix_lame(wave))
    if(logger){
      fprintf(
        logger,
        "\nIgnored extra RIFF tail..."
      );
      ("await",fflush(logger));
    }
  var buffer = wave.buffer;
  if(is_stereo){
    if(is_16bit){
      wave.bytes = wave.bytes&~3;
      wave.length = wave.bytes>>2;
      wave.shift = 2;
      wave.array = new Int16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2);
      wave.based = new Uint32Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/4);
    }else{
      wave.bytes = wave.bytes&~1;
      wave.length = wave.bytes>>1;
      wave.shift = 1;
      wave.array = new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength);
      wave.based = new Uint16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2);
    }
  }else{
    if(is_16bit){
      wave.bytes = wave.bytes&~1;
      wave.length = wave.bytes>>1;
      wave.shift = 1|4;
      wave.array = new Int16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2);
      wave.based = new Uint16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2);
    }else{
      wave.length = wave.bytes;
      wave.shift = 0;
      wave.array = new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength);
      wave.based = new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength);
    }
  }
  time = print_time(wave.length,wave.rate);
  if(logger){
    fprintf(logger," bytes: %d, length: %s\n",wave.bytes,time);
    ("await",fflush(logger));
  }
  return true;
};

"async";function save_wave( // bool
  wave, // wave_data*
  stream, // FILE*
  from, // int
  count // uint
){
  var zero = Buffer.alloc(4); // int
  zero[0] = 0;
  var shift = wave.shift&3; // int
  var bytes; // int
  bytes = update_header(wave.header,count);
  if(bytes<1)
    return false;
  count <<= shift;
  from <<= shift;
  if(write_file(
    stream,
    wave.header,
    sizeof("wave_header")
  )!=sizeof("wave_header"))
    return false;
  if(write_file(stream,wave.buffer.slice(from),count)!=count)
    return false;
  if(bytes&1)
    write_file(stream,zero,1);
  ("await",fflush(stream));
  return true;
};

function compute_primes( // uint
    array, // uint[]
    count, // uint
    largest, // uint
    one_too // bool
  ){
  var prime; // uint
  var i; // uint
  var have; // uint
  var root; // uint
  var from; // uint
  if(count<1 || largest<1)
    return 0;
  from = 1;
  have = 0;
  if(one_too){
    array[have++] = 1;
    if(count==1 || largest==1)
      return 1;
    from = 2;
  }
  array[have++] = 2;
  for(prime=3; prime<=largest && have<count; prime+=2){
    array[have] = prime;
    root = Math.sqrt(prime)|0;
    for(i=from; i<have && array[i]<=root; i++)
      if(prime%array[i]==0){
        have--;
        break;
      }
    have++;
  }
  return have;
};

function count_primes( // uint
  value // uint
){
  if(value<2)
    return 2;
  return ((1.25506*value/Math.log(value))+1)|0;
};


function samp_16stereo(buffer,index){
  index <<= 1;
  var V = buffer[index];
  var L = V>0 ? V/0x7fff : V/0x8000;
  V = buffer[index+1];
  var R = V>0 ? V/0x7fff : V/0x8000;
  return (L+R)/2;
};

function samp_8stereo(buffer,index){
  index <<= 1;
  var V = buffer[index]-0x80;
  var L = V>0 ? V/0x7f : V/0x80;
  V = buffer[index+1]-0x80;
  var R = V>0 ? V/0x7f : V/0x80;
  return (L+R)/2;
};

function samp_16mono(buffer,index){
  var V = buffer[index];
  var C = V>0 ? V/0x7fff : V/0x8000;
  return C;
};

function samp_8mono(buffer,index){
  var V = buffer[index]-0x80;
  var C = V>0 ? V/0x7f : V/0x80;
  return C;
};

"async";function display_wave( // void
  wave, // wave_data*
  logger // FILE*
){
  var total = 78; // int
  var lines = 16; // int
  var values = []; // int[78*16]
  values.length = 78*16;
  for(var i=0; i<values.length; i++)
    values[i] = 0;
  var send; // char[78+2]
  var scale = 6; // int
  var disp = " .+*xX#?"; // char*
  var i,j; // int
  var from; // int
  var up; // int
  var to; // int
  var size; // int
  var use; // int
  var row; // int
  var samp; // float
  var prev; // float
  var shift = wave.shift; // int
  var array = wave.array; // void*
  var sampler;
  switch(shift){
    case 0:
      sampler = samp_8mono;
    break;
    case 1:
      sampler = samp_8stereo;
    break;
    case 2:
      sampler = samp_16stereo;
    break;
    default:
      sampler = samp_16mono;
    break;
  }
  for(j=0; j<total; j++){
    row = j*lines;
    from = ((1.0*j/total)*wave.length)|0;
    to = ((1.0*(j+1)/total)*wave.length)|0;
    size = 0;
    prev = 0.0;
    up = 0;
    use = 0;
    for(i=from; i<to; i++){
      samp = sampler(array,i);
      if(i>from){
        if(up>0){
          if(samp<prev){
            up = -1;
            use = 1;
          }
        }else if(up<0){
          if(samp>prev){
            up = -1;
            use = 1;
          }
        }else{
          if(samp>prev)
            up = 1;
          else if(samp<prev)
            up = -1;
        }
      }
      if(use){
        if(prev<0)
          prev = -prev;
        prev = Math.sqrt(prev*1.5);
        if(prev>1)
          prev = 1;
        use = (prev*(lines-1))|0;
        if(++values[row+use]>size)
          size = values[row+use];
        use = 0;
      }
      prev = samp;
    }
    if(values[row+lines-1]>values[row+lines-2])
      values[row+lines-2] = values[row+lines-1];
    for(i=lines-2; i>=0; i--){
      if(size)
        use = (values[row+i]*scale/size)|0;
      else
        use = 0;
      values[row+i] = use;
    }
  }
  for(i=lines-2; i>=0; i--){
    send = "";
    for(j=0; j<total; j++)
      send += disp[values[j*lines+i]];
    fprintf(logger,"%s",send+'\n');
  }
  ("await",fflush(logger));
};

function normalize_diff( // float
  total_diff, // float
  number // int
){
  if(number<1)
    return 0.0;
  return Math.sqrt(total_diff/number)*100;
};

function diff_16stereo(buffer,I1,I2){
  var V,L,R;
  V = buffer[I1 <<= 1],
  L = V>0 ? V/0x7fff : V/0x8000;
  V = buffer[I1+1];
  R = V>0 ? V/0x7fff : V/0x8000;
  V = buffer[I2 <<= 1];
  L -= V>0 ? V/0x7fff : V/0x8000;
  V = buffer[I2+1];
  R -= V>0 ? V/0x7fff : V/0x8000;
  return L*L+R*R;
};

function diff_8stereo(buffer,I1,I2){
  var V,L,R;
  V = buffer[I1 <<= 1]-0x80;
  L = V>0 ? V/0x7f : V/0x80;
  V = buffer[I1+1]-0x80;
  R = V>0 ? V/0x7f : V/0x80;
  V = buffer[I2 <<= 1]-0x80;
  L -= V>0 ? V/0x7f : V/0x80;
  V = buffer[I2+1]-0x80;
  R -= V>0 ? V/0x7f : V/0x80;
  return L*L+R*R;
};

function diff_16mono(buffer,I1,I2){
  var V,L;
  V = buffer[I1];
  L = V>0 ? V/0x7fff : V/0x8000;
  V = buffer[I2];
  L -= V>0 ? V/0x7fff : V/0x8000;
  return L*L;
};

function diff_8mono(buffer,I1,I2){
  var V,L;
  V = buffer[I1]-0x80;
  L = V>0 ? V/0x7f : V/0x80;
  V = buffer[I2]-0x80;
  L -= V>0 ? V/0x7f : V/0x80;
  return L*L;
};

function diff_wave( // float
  wave, // wave_data*
  first, // int
  second, // int
  count, // int
  step // int
){
  var buffer = wave.array; // void*
  var diff = 0.0; // float
  var i; // int
  if(step<1)
    return diff;
  var comparator;
  switch(wave.shift){
    case 0:
      comparator = diff_8mono;
    break;
    case 1:
      comparator = diff_8stereo;
    break;
    case 2:
      comparator = diff_16stereo;
    break;
    default:
      comparator = diff_16mono;
    break;
  }
  if(count>0)
    for(i=0; i<count; i+=step)
      diff += comparator(buffer,first+i,second+i);
  else
    for(i=0; i>count; i-=step)
      diff += comparator(buffer,first+i,second+i);
  return diff;
};

function zero_16stereo(buffer,I){
  var V,L,R;
  V = buffer[I <<= 1];
  L = V>0 ? V/0x7fff : V/0x8000;
  V = buffer[I+1];
  R = V>0 ? V/0x7fff : V/0x8000;
  return L*L+R*R;
};

function zero_8stereo(buffer,I){
  var V,L,R;
  V = buffer[I <<= 1]-0x80;
  L = V>0 ? V/0x7f : V/0x80;
  V = buffer[I+1]-0x80;
  R = V>0 ? V/0x7f : V/0x80;
  return L*L+R*R;
};

function zero_16mono(buffer,I){
  var V,L;
  V = buffer[I];
  L = V>0 ? V/0x7fff : V/0x8000;
  return L*L;
};

function zero_8mono(buffer,I){
  var V,L;
  V = buffer[I]-0x80;
  L = V>0 ? V/0x7f : V/0x80;
  return L*L;
};

function seek_zero( // int
  wave, // wave_data*
  radius, // int
  where // int
){
  var buffer = wave.array; // void*
  var current; // float
  var smallest = -1; // float
  var shift = 0; // int
  var walk; // int
  var zerotest;
  switch(wave.shift){
    case 0:
      zerotest = zero_8mono;
    break;
    case 1:
      zerotest = zero_8stereo;
    break;
    case 2:
      zerotest = zero_16stereo;
    break;
    default:
      zerotest = zero_16mono;
    break;
  }
  for(walk=-radius; walk<=radius; walk++){
    current = zerotest(buffer,where+walk);
    if(current<smallest || smallest<0){
      smallest = current;
      shift = walk;
    }
  }
  return shift;
};

function seek_boundary( // int
  wave, // wave_data*
  point_in, // int
  length_of // int
){
  var length = wave.length; // int
  var area = (length/1000)|0; // int
  var first = point_in; // int
  var second = point_in+length_of; // int
  var move_left = 0; // int
  var move_right = 0; // int
  var diff_left = -1; // float
  var diff_right = -1; // float
  var size_compare; // int
  while(move_left+move_right<length_of){
    if(diff_left<0 && first-(move_left+area)>0)
      diff_left = diff_wave(
        wave,
        first-(move_left+area),
        second-(move_left+area),
        area,
        1
      );
    if(diff_right<0 && second+(move_right+area)<length)
      diff_right = diff_wave(
        wave,
        first+move_right,
        second+move_right,
        area,
        1
      );
    if(diff_left>=0 && (diff_left<diff_right || diff_right<0)){
      move_left += area;
      diff_left = -1;
    }else if(diff_right>=0){
      move_right += area;
      diff_right = -1;
    }else
      break;
  }
  size_compare = (move_left+move_right)-length_of;
  if(size_compare<2)
    return first-move_left;
  return first-(move_left-(size_compare>>1));
};


function swap_halves( // void
  wave, // wave_data*
  from, // int
  size // int
){
  var buffer = wave.based; // void*
  var half; // int
  var i; // int
  var a,b; // int
  var one,tmp; // uint
  if(size<2)
    return;
  half = size >> 1;
  a = from;
  b = from+half;
  if(!(size&1))
    for(i=0; i<half; i++){
      one = buffer[a];
      buffer[a] = buffer[b];
      buffer[b] = one;
      a++;
      b++;
    }
  else{
    tmp = buffer[size-1];
    for(i=0; i<half; i++){
      one = buffer[a];
      buffer[a] = buffer[b];
      buffer[b] = tmp;
      tmp = one;
      a++;
      b++;
    }
    buffer[size-1] = tmp;
  }
};

function move_samples( // void
  wave, // wave_data*
  from, // int
  size, // int
  to // int
){
  var shift = wave.shift&3; // int
  from <<= shift;
  size <<= shift;
  to <<= shift;
  memmove(
    wave.buffer.slice(to),
    wave.buffer.slice(from),
    size
  );
};

"async";function save_repeat( // bool
    wave, // wave_data*
    begin, // int
    end, // int
    outfile, // FILE*
    loopfile // FILE*
  ){
  var length = wave.length; // int
  var size = end-begin; // int
  var success = true; // bool
  if(loopfile){
    swap_halves(wave,begin,size);
    if(!("await",save_wave(wave,loopfile,begin,size)))
      success = false;
  }
  if(outfile){
    move_samples(wave,end,length-end,begin);
    if(!("await",save_wave(wave,outfile,0,length-size)))
      success = false;
  }
  return success;
};

function guess_length( // int
  wave, // wave_data*
  starting_point, // int
  primes, // uint[]
  primes_size, // int
  temp_int, // uint[]
  temp_float, // float[]
  reverse // bool
){
  var length = wave.length; // int
  var from; // int
  var last; // int
  var size; // int
  var candidates = temp_int; // uint*
  var best = -1; // float
  var test; // float
  var ever; // float
  var mean; // float
  var have = 0; // int
  var take; // int
  var step; // uint
  var prime_index; // uint
  var i; // int
  size = (length/10)|0;
  if(reverse){
    last = starting_point-(((length/5)|0)-((length/1000)|0));
    from = starting_point-(((length/2)|0)+((length/1000)|0));
    if(from-size<0)
      from = size;
    size = -size;
  }else{
    from = starting_point+(((length/5)|0)-((length/1000)|0));
    last = starting_point+(((length/2)|0)+((length/1000)|0));
    if(last+size>length)
      last = length-size;
  }
  for(i=from; i<last; i++)
    candidates[have++] = i;
  prime_index = primes_size-1;
  while(have>1){
    step = primes[prime_index];
    ever = 0.0;
    for(i=0; i<have; i++){
      test = diff_wave(
        wave, 
        starting_point,
        candidates[i],
        size,
        step
      );
      ever += test;
      if(test<best || !i)
        best = test;
      temp_float[i] = test;
    }
    mean = best+0.75*(ever/have-best);
    take = 0;
    for(i=0; i<have; i++)
      if(temp_float[i]<=mean)
        candidates[take++] = candidates[i];
    have = take;
    if(!prime_index)
      break;
    prime_index >>= 1;
  };
  if(reverse)
    return starting_point-candidates[0];
  return candidates[0]-starting_point; 
};

function finder_add( // void
  finder, // array_finder*
  from, // int
  size // int
){
  var i; // int
  for(i=finder[0].from; i>0; i--)
    if(finder[i].from==from){
      from = -1;
      break;
  }
  if(from>=0)
    finder[++finder[0].from].from = from;
  for(i=finder[0].size; i>0; i--)
    if(finder[i].size==size){
      size = -1;
      break;
  }
  if(size>=0)
    finder[++finder[0].size].size = size;
};

"async";function finder_use( // float
  wave, // wave_data*
  finder, // array_finder*
  begin, // int*
  end, // int*
  find, // int*
  logger // FILE*
){
  var Return = {};
  var i,j; // int
  var length_from = finder[0].from; // int
  var length_size = finder[0].size; // int
  var temp; // int
  var zone; // int
  var from; // int
  var size; // int
  var radius = (wave.length/2000)|0; // int
  var diff; // float
  var best; // float
  var best_from = 0; // int
  var best_size = 0; // int
  var first; // int
  var second; // int
  for(i=1; i<=length_from; i++)
    finder[i].from += seek_zero(
      wave,
      radius,
      finder[i].from
    );
  for(i=1; i<=length_from; i++)
    for(j=i+1; j<=length_from; j++)
      if(finder[i].from>finder[j].from){
        temp = finder[i].from;
        finder[i].from = finder[j].from;
        finder[j].from = temp;
      }
  for(i=1; i<=length_size; i++)
    for(j=i+1; j<=length_size; j++)
      if(finder[i].size>finder[j].size){
        temp = finder[i].size;
        finder[i].size = finder[j].size;
        finder[j].size = temp;
      }
  j = 1;
  for(i=2; i<=length_from; i++)
    if(finder[i].from!=finder[j].from)
      finder[++j].from = finder[i].from;
  length_from = j;
  finder[0].from = j;
  j = 1;
  for(i=2; i<=length_size; i++)
    if(finder[i].size!=finder[j].size)
      finder[++j].size = finder[i].size;
  length_size = j;
  finder[0].size = j;
  if(logger){
    fprintf(
      logger,
      "Refining: %s x %s...  ",
      dpad(length_from,2,' ',false),
      dpad(length_size,2,' ',true)
    );
    ("await",fflush(logger));
  }
  Return.find = length_from+length_size;
  best = -1;
  for(j=1; j<=length_size; j++){
    if(logger)
      ("await",fflush(logger));
    size = finder[j].size;
    zone = (size/3)|0;
    for(i=1; i<=length_from; i++){
      from = finder[i].from;
      if(from-zone<0 || from+size+zone>=wave.length)
        continue;
      diff = diff_wave(
        wave,
        from-zone,
        from+size-zone,
        zone*2,
        1
      );
      diff = normalize_diff(diff,zone*2);
      if(diff<best || best<0){
        best_from = from;
        best_size = size;
        best = diff;
      }
    }
  }
  if(logger){
    fprintf(logger,"START: %s ",dpad(best_from,10,' ',true));
    ("await",fflush(logger));
  }
  best = -1;
  for(i=-10; i<=10; i++){
    from = best_from;
    size = best_size+i;
    zone = (size>>1)-20;
    first = from-zone;
    second = from+size+zone;
    if(first<0)
      first = 0;
    else if(second>=wave.length)
      first -= second+1-wave.length;
    diff = diff_wave(
      wave,
      first,
      first+size,
      zone*2,
      1
    );
    diff = normalize_diff(diff,zone*2);
    if(diff<best || best<0){
      best = diff;
      Return.begin = from;
      Return.end = from+size;
    }
  }
  if(logger){
    fprintf(
      logger,
      "END: %s SIZE: %s\n",
      dpad(Return.end,10,' ',true),
      dpad(Return.end-Return.begin,10,' ',true)
    );
    ("await",fflush(logger));
  }
  Return.result = best;
  return Return;
};

"async";function find_repeat( // float
  wave, // wave_data*
  cut_from, // int*
  cut_to, // int*
  find, // int*
  logger // FILE*
){
  var length = wave.length; // int
  var loop_test; // int
  var loop_length; // int
  var loop_start; // int
  var loop_middle; // int
  var seek_from = (length/8)|0; // int
  var seek_to = (length/2)|0; // int
  var seek_step = (length/16)|0; // int
  var seek; // int
  var seek_curr; // int
  var reverse; // int
  var loop_curr; // int
  var total_memory; // int
  var integer_array; // uint*
  var float_array; // float*
  var primes_array; // uint*
  var primes_length; // uint
  var half_length = (length/2)|0; // int
  var finder = []; // array_finder[16]
  finder.length = 16;
  for(var i=0; i<finder.length; i++)
    finder[i] = {from:0,size:0};
  primes_length = count_primes(half_length);
  integer_array = new Uint32Array(half_length);
  float_array = new Float32Array(half_length);
  primes_array = new Uint32Array(primes_length);
  total_memory =
    sizeof("uint")*half_length +
    sizeof("float")*half_length +
    sizeof("uint")*primes_length +
    wave.bytes;
  primes_length = compute_primes(
    primes_array,
    half_length,
    (length/40)|0,
    true
  );
  if(logger){
    fprintf(
      logger,
      "Total samples: %d, memory used: %d Mb, environment: %s\n",
      length,
      (1.0*total_memory/(1024*1024)+0.5)|0,
      MY_ENVIRONMENT
    );
    ("await",fflush(logger));
  }
  loop_curr = 0;
  for(seek=seek_from; seek<=seek_to; seek+=seek_step){
    for(reverse=0; reverse<=1; reverse++){
      loop_curr++;
      seek_curr = reverse ? length-seek : seek;
      loop_test = seek_curr + seek_zero(
        wave,
        (length/2000)|0,
        seek_curr
      );
      loop_length = guess_length(
        wave,
        loop_test,
        primes_array,
        primes_length,
        integer_array,
        float_array,
        reverse
      );
      if(reverse)
        loop_test -= loop_length;
      loop_start = seek_boundary(
        wave,
        loop_test,
        loop_length
      );
      loop_middle = loop_start+(loop_length>>1);
      finder_add(
        finder,
        loop_middle,
        loop_length
      );
      if(logger){
        fprintf(
          logger,
          "%s%s",
          dpad(loop_length,10,' ',false),
          loop_curr%7 ? ' ' : '\n'
        );
        ("await",fflush(logger));
      }
    }
  }
  primes_array = null;
  integer_array = null;
  float_array = null;
  return ("await",finder_use(
    wave,
    finder,
    cut_from,
    cut_to,
    find,
    logger
  ));
};

"async";function draw_cut( // void
  wave, // wave_data*
  begin, // int
  end, // int
  logger // FILE*
){
  var i; // int
  var from; // int
  var to; // int
  var width = 78; // int
  var draw; // char[78+2]
  from = (1.0*begin/wave.length*width+0.5)|0;
  to = (1.0*end/wave.length*width+0.5)|0;
  draw = "";
  for(i=0; i<width; i++)
    if(i>from && i<to)
      draw += '$';
    else if(i==from || i==to)
      draw += '|';
    else
      draw += '-';
  draw += '\n';
  fprintf(logger,"%s",draw);
  ("await",fflush(logger));
};

function calc_grade( // const char*
  finder, // int
  diff, // float
  percent // float
){
  var res; // const char*
  var grade = 0; // int
  if(percent<30)
    grade--;
  else if(percent>40)
    grade++;
  if(diff<10)
    grade++;
  else if(diff>20)
    grade--;
  if(finder<14)
    grade++;
  else if(finder>20)
    grade--;
  switch(grade){
    case 3:
      res = "A+";
    break;
    case 2:
      res = "A ";
    break;
    case 1:
      res = "B ";
    break;
    case 0:
      res = "C ";
    break;
    case -1:
      res = "D ";
    break;
    case -2:
      res = "E ";
    break;
    case -3:
      res = "F ";
    break;
    default:
      res = "? ";
    break;
  }
  return res;
};

"async";function algo_work( // bool
  file_in, // FILE*
  file_out, // FILE*
  file_loop, // FILE*
  logger // FILE*
){
  if(file_in===-1)
    file_in = stdin;
  var diff; // float
  var perc; // float
  var find = true; // int
  var grade; // const char*
  var success = true; // bool
  var wave = wave_data();
  var time_begin; // clock_t
  var time_end; // clock_t
  var cut_begin = true; // int
  var cut_end =true; // int
  var sec_begin; // char[32]
  var sec_end; // char[32]
  var sec_size; // char[32]
  if(!read_header(
    wave.header,
    file_in
  )){
    if(logger){
      fprintf(
        logger,
        "Input file read error or invalid WAVE format!\n"
      );
      ("await",fflush(logger));
    }
    return false;
  }
  if(!("await",read_wave(wave,file_in,logger)))
    return false;
  if(wave.length<5000){
    if(logger){
      fprintf(logger,"The file is too small!\n");
      ("await",fflush(logger));
    }
    return false;
  }
  if(logger)
    ("await",display_wave(wave,logger));
  time_begin = clock();
  diff = ("await",find_repeat(
    wave,
    cut_begin,
    cut_end,
    find,
    logger
  ));
  cut_begin = diff.begin;
  cut_end = diff.end;
  find = diff.find;
  diff = diff.result;
  time_end = clock();
  sec_begin = print_time(cut_begin,wave.rate);
  sec_end = print_time(cut_end,wave.rate);
  sec_size = print_time(cut_end-cut_begin,wave.rate);
  perc = 100.0*(cut_end-cut_begin)/wave.length;
  grade = calc_grade(find,diff,perc);
  if(logger){
    ("await",draw_cut(wave,cut_begin,cut_end,logger));
    fprintf(
      logger,
      "Cut: %s - %s = -%s (-%s%%), diff = %s\n",
      sec_begin,
      sec_end,
      sec_size,
      perc.toFixed(1),
      diff.toFixed(3)
    );
    fprintf(
      logger,
      "Algorithm took %s sec. Your grade of quality: %s ...",
      (1.0*(time_end-time_begin)/CLOCKS_PER_SEC).toFixed(2),
      grade
    );
    ("await",fflush(logger));
  }
  if(file_out||file_loop){
    success = ("await",save_repeat(wave,cut_begin,cut_end,file_out,file_loop));
    if(logger){
      fprintf(
        logger,
        " saving: %s!\n",
        success ? "success" : "ERROR"
      );
      ("await",fflush(logger));
    }
  }else if(logger){
    fprintf(logger," done!\n");
    ("await",fflush(logger));
  }
  wave.buffer = null;
  return success;
};

"async";function open_file( // FILE*
  base, // const char*
  add, // const char*
  prompt, // const char*
  logger // FILE*
){
  var result; // FILE*
  var oldext = ".old"; // const char*
  var removed; // bool
  var renamed; // bool
  var name; // char*
  var temp; // char*
  name = base+add;
  temp = name+oldext;
  removed = (remove(temp)==0);
  renamed = (rename(name,temp)==0);
  result = fopen(name,"w");
  if(!result){
    if(renamed)
      rename(temp,name);
    if(logger){
      fprintf(logger,"%s \"%s\" open error!\n",prompt,name);
      ("await",fflush(logger));
    }
    return null;
  }
  if(logger){
      fprintf(logger,"%s: \"%s\" ",prompt,name);
    if(renamed){
      if(removed)
        fprintf(logger,"[%s replaced]\n",oldext);
      else
        fprintf(logger,"[%s renamed]\n",oldext);
    }else
      fprintf(logger,"\n");
    ("await",fflush(logger));
  }
  name = null;
  temp = null;
  return result;
};

"async";function console_wait( // int
  wait, // int
  infile, // FILE*
  outfile, // FILE*
  loopfile // FILE*
){
  if(!node)
    return 0;
  var Wait = "=== Press ENTER to exit ==="; // const char*
  if(!wait)
    return -1;
  if(infile&&infile!=-1)
    fclose(infile);
  if(outfile)
    fclose(outfile);
  if(loopfile)
    fclose(loopfile);
  fprintf(stdout,"%s",Wait);
  ("await",fflush(stdout));
  if(wait!=2){
    fprintf(stderr,"%s",Wait);
    ("await",fflush(stderr));
  }
  process.stdin.resume();
  process.stdin.setEncoding("ascii");
  process.stdin.on("data",function(input){
    if(input.indexOf("\n")>=0)
      process.exit();
  });
  return -1;
}

"async";function main( // int
  argc, // int
  argv // char*[]
){
  var wait = 0; // int
  var succ; // bool
  var Source = "Source"; // const char*
  var Output = "Output"; // const char*
  var Repeat = "Repeat"; // const char*
  var infile = null; // FILE*
  var outfile = null; // FILE*
  var loopfile = null; // FILE*
  var logger = stderr; // FILE*
  if(ISBE){
    printf("This program must be compiled for little-endian 32bit platform only!\n");
    return 0;
  }
  wait = argc<3;
  if(argc<2 || argc>4){
    printf("RepeatRemove v1.2, by Kly_Men_COmpany!  (License: WTFPL)  Usage:\n");
    printf("  repeat_remove \"in.wav\" \"out.wav\" \"loop.wav\"   [general mode, full control]\n");
    printf("  repeat_remove \"in.wav\" \"out.wav\"   [skipping debug loop output]\n");
    printf("  repeat_remove \"in.wav\"   [assumed \"in.wav.out.wav\" and \"in.wav.loop.wav\"]\n");
    printf("  repeat_remove - <\"in.wav\"   [outputs are ignored, logging-only mode]\n");
    printf("  repeat_remove - - <\"in.wav\" >\"out.wav\"   [piping mode, no loop output]\n");
    printf("  repeat_remove - - - <\"in.wav\" >\"out.wav\" 2>\"loop.wav\"   [no stderr logging]\n");
    printf("Supports one file Shell drag-and-drop. Piping MP3 via LAME or FLAC via FFMPEG:\n");
    printf("  lame --decode in.mp3 - | repeat_remove - - | lame --preset extreme - out.mp3\n");
    printf("  ffmpeg -i in.flac -f wav - | repeat_remove - - | ffmpeg -y -i - out.flac\n");
    printf("This program will process WAVE music file - to find there a \"repeat\".\n");
    printf("That's a loop of the exact same moment, repeated twice or more.\n");
    printf("You will have another .wav output file without that loop (precisely cut),\n");
    printf("and optionally the loop itself, with swapped halves (so you could examine it).\n");
    printf("To work properly, this program implies some rules. Make sure that:\n");
    printf(" 1) Your file actually has the repeat! Otherwise, an output will be broken;\n");
    printf(" 2) The length of the intro before the loop, and the finale after -\n");
    printf("    are not larger than one repeat length. So, the looped part should be big;\n");
    printf(" 3) Wave file has more than 5000 samples, but also not larger than 200-450 Mb;\n");
    printf(" 4) Your file contains real music: not a complete silence, noise or signals.\n");
    printf("If you have three or more loops, be prepared to invoke this program\n");
    printf("several times, manually checking the quality of intermediate cuttings.\n");
    return ("await",console_wait(2,infile,outfile,loopfile));
  }
  if(argc>1 && (argv[1]=="-")){
    infile = -1; // stdin;
    wait = false;
  }
  if(argc>2 && (argv[2]=="-"))
    outfile = stdout;
  if(argc>3 && (argv[3]=="-")){
    if(outfile){
      loopfile = stderr;
      logger = null;
    }else
      loopfile = stdout;
  }
  if(logger){
    fprintf(logger,"\nRepeatRemove v1.2!\n");
    fprintf(
      logger,
      "%s: \"%s\"\n",
      Source,
      infile ? "<stdin>" : argv[1]
    );
    "await",fflush(logger);
  }
  if(!infile){
    infile = fopen(argv[1],"r");
    if(!infile){
      if(logger)
        fprintf(logger,"Input file open error!\n");
      return ("await",console_wait(wait,infile,outfile,loopfile));
    }
    if(argc<3){
      outfile = ("await",open_file(argv[1],".out.wav",Output,logger));
      if(outfile)
        loopfile = ("await",open_file(argv[1],".loop.wav",Repeat,logger));
      if(!loopfile || !outfile)
        return ("await",console_wait(wait,infile,outfile,loopfile));
    }
  }
  if(!outfile && argc>2){
    outfile = ("await",open_file(argv[2],"",Output,logger));
    if(!outfile)
      return ("await",console_wait(wait,infile,outfile,loopfile));
  }else if(!outfile || outfile==stdout){
    if(logger){
      fprintf(
        logger,
        "%s: \"%s\"\n",
        Output,
        outfile ? "<stdout>" : "<null>"
      );
      "await",fflush(logger);
    }
  }
  if(!loopfile && argc>3){
    loopfile = ("await",open_file(
      argv[3],
      "",
      Repeat,
      logger
    ));
    if(!loopfile)
      return ("await",console_wait(wait,infile,outfile,loopfile));
  }else if(!loopfile || loopfile==stdout){
    if(logger){
      fprintf(
        logger,
        "%s: \"%s\"\n",
        Repeat,
        loopfile ? "<stdout>" : "<null>"
      );
      "await",fflush(logger);
    }
  }
  succ = ("await",algo_work(infile,outfile,loopfile,logger));
  console_wait(wait,infile,outfile,loopfile);
  return succ ? 0 : -1;
};

if(node)
  return main;

function init(){
  fopen_count = 0;
  outblobs = [];
  stdin = null
  panic_abort = false;
};

function UrlToArrayBuffer(url,cb){
  var xhr = new XMLHttpRequest();
  xhr.open('GET',url,true);
  xhr.responseType = 'blob';
  xhr.onload = function(e){
    if(xhr.status==200){
      var fileReader = new FileReader();
      fileReader.onload = function(event){
        cb(event.target.result);
      };
      fileReader.readAsArrayBuffer(xhr.response);
    }
  };
  xhr.send();
};

var myonmessage = function(msg){
  switch(msg.data.action){
    case 'start':{
      init();
      var url = msg.data.url;
      if(!url){
        try{
          var promise = main(1,['']);
          var done = function(){
            mypostMessage({action:'done',res:null});
          };
          if(promise.then)
            promise.then(done).catch(function(e){
              init();
              if(e!='abort')
                throw e;
            });
          else
            done();
        }catch(e){
          init();
          throw e;
        }
        return;
      }
      UrlToArrayBuffer(url,function(ab){
        stdin = ab;
        try{
          var promise = main(2,['',msg.data.name||'-']);
          var done = function(){
            var res = outblobs.map(function(blob){
              return {
                blob: URL.createObjectURL(blob.blob),
                name: blob.name,
              };
            });
            mypostMessage({action:'done',res:res});
            init();
          }
          if(promise.then)
            promise.then(done).catch(function(e){
              init();
              if(e!='abort')
                throw e;
            });
          else
            done();
        }catch(e){
          init();
          throw e;
        }
      });
    }
    break;
    case 'abort':{
      panic_abort = true;
    }
    break;
  }
};

if(browser){
  window.repeat_remove = function(data,postMessage){
    if(postMessage)
      mypostMessage = function(data){
        if(!panic_abort)
          postMessage({data:data});
      };
    myonmessage({data:data});
  }
}else{
  self.onmessage = myonmessage;
  mypostMessage = self.postMessage;
}

};

})();

// EOF