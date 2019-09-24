// repeat_remove.c v1.2, by Kly_Men_COmpany!
// License: WTFPL

/*
  == Build commands (target should be 32-bit executable) ==
  Unix GCC compiler: (tested on v5.4, v6.3, v8.2, v9.1)
gcc -Wall -Wextra -flto -msse3 -fomit-frame-pointer -ffast-math -lm -O3 -std=c99 repeat_remove.c -o repeat_remove
  Clang LLVM compiler: (tested on v3.7.1, v3.8.1, v8)
clang -Wall -Wextra -m32 -fomit-frame-pointer -m32 -lm -O2 -std=c99 repeat_remove.c -o repeat_remove
  Windows Borland C compiler: (tested on v5.5.1)
bcc32.exe -6 -d -ff -G -Ox -OS -pr -WC -xf -vi -O2 -k- -RT- repeat_remove.c
  Microsoft Visual Studio compiler: (tested on v15.00)
cl.exe /Ox /Gr repeat_remove.c
*/

#include <stdlib.h>
#include <stdio.h>
#include <memory.h>
#include <string.h>
#include <math.h>
#include <time.h>

#ifdef _WIN32
  #include <io.h>
  #include <fcntl.h>
  #ifdef __MINGW32__
    #ifndef fileno
      int fileno(FILE*);
    #endif
    #ifndef setmode
      int setmode(int,int);
    #endif
    #ifndef O_BINARY
      #define O_BINARY 0x8000
    #endif
  #endif
  typedef signed __int8 int8_t;
  typedef unsigned __int8 uint8_t;
  typedef signed __int16 int16_t;
  typedef unsigned __int16 uint16_t;
  typedef signed __int32 int32_t;
  typedef unsigned __int32 uint32_t;
  #define MY_ENVIRONMENT "Win32"
#else
  #include <stdint.h>
  #define MY_ENVIRONMENT "Unix"
#endif

typedef int int_;
#define int int32_t
#define uint uint32_t
#define short int16_t
#define ushort uint16_t
#define uchar uint8_t

#define bool int
#define true 1
#define false 0

/*
#define ISBE (!(*((short*)"0\0")&0xff))
#define BE2(x) (((x)&0xff)>>8)|((x)<<8)
#define BE4(x) (((x)&0xff000000)>>24)|(((x)&0xff0000)>>8)|(((x)&0xff00)<<8)|((x)<<24)
#define LE2(x) ((ISBE)?(BE2(x)):(x))
#define LE4(x) ((ISBE)?(BE4(x)):(x))
*/

int read_file(
  FILE* stream,
  void* buffer,
  int size
){
  int have;
  int total = 0;
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
    buffer = ((char*)buffer)+have;
    size -= have;
  }
  return total;
};

uint write_file(
  FILE* stream,
  void* buffer,
  int size
){
  int have;
  uint total = 0;
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
    buffer = ((char*)buffer)+have;
    size -= have;
  }
  return total;
};

typedef struct wave_header {
// https://gist.github.com/Jon-Schneider/8b7c53d27a7a13346a643dac9c19d34f
  char riff_header[4];
  int wav_size;
  char wave_header[4];
  char fmt_header[4];
  int fmt_chunk_size;
  short audio_format;
  short num_channels;
  int sample_rate;
  int byte_rate;
  short sample_alignment;
  short bit_depth;
  char data_header[4];
  int data_bytes;
} wave_header;

typedef struct {
  wave_header header;
  void* buffer;
  int length;
  int bytes;
  int shift;
  int rate;
} wave_data;

bool skip_chunk(
  FILE* stream,
  wave_header* head,
  void* in_header,
  int skip
){
  int tail = sizeof(wave_header)-(((char*)in_header)-((char*)head));
  void* temp;
  temp = malloc(skip);
  if(!temp)
    return false;
  if(read_file(stream,temp,skip)!=skip){
    free(temp);
    return false;
  }
  if(skip<tail){
    memmove(
      in_header,
      ((char*)in_header)+skip,
      tail-skip
    );
    memcpy(
      ((char*)in_header)+(tail-skip),
      temp,
      skip
    );
  }else{
    memcpy(
      in_header,
      ((char*)temp)+(skip-tail),
      tail
    );
  }
  free(temp);
  return true;
};

bool read_header(
  wave_header* header,
  FILE* stream
){
  int next;
  if(read_file(stream,header,sizeof(wave_header))!=sizeof(wave_header))
    return false;
  if(memcmp(header->riff_header,"RIFF",4))
    return false;
  if(memcmp(header->wave_header,"WAVE",4))
    return false;
  while(memcmp(header->fmt_header,"fmt ",4)){
    next = header->fmt_chunk_size;
    if(next<0 || next>1024*1024)
      return false;
    if(next&1)
      next++;
    next += 8;
    if(!skip_chunk(stream,header,&header->fmt_header,next))
      return false;
  }
  while(memcmp(header->data_header,"data",4)){
    next = header->data_bytes;
    if(next<0 || next>1024*1024)
      return false;
    if(next&1)
      next++;
    next += 8;
    if(!skip_chunk(stream,header,&header->data_header,next))
      return false;
  }
  return true;
};

bool check_header(
    const wave_header* header,
    bool* is_stereo,
    bool* is_16bit,
    bool* sample_rate,
    int* data_bytes
  ){
  if(header->wav_size>0 && header->data_bytes>0)
    if(header->wav_size<header->data_bytes)
      return false;
  if(header->fmt_chunk_size!=16)
    return false;
  if(header->audio_format!=1)
    return false;
  if(header->num_channels!=1 && header->num_channels!=2)
    return false;
  if(header->bit_depth!=8 && header->bit_depth!=16)
    return false;
  if(is_stereo)
    *is_stereo = header->num_channels==2;
  if(is_16bit)
    *is_16bit = header->bit_depth==16;
  if(sample_rate)
    *sample_rate = header->sample_rate;
  if(data_bytes){
    if(header->data_bytes>0 && header->data_bytes<0x7fffffff)
      *data_bytes = header->data_bytes;
    else
      *data_bytes = -1;
  }
  return true;
};

int update_header(
  wave_header* header,
  int need_samples
){
  int bytes;
  bool is_stereo;
  bool is_16bit;
  if(!check_header(header,&is_stereo,&is_16bit,NULL,NULL))
    return -1;
  bytes = need_samples;
  if(is_stereo)
    bytes <<= 1;
  if(is_16bit)
    bytes <<= 1;
  header->data_bytes = bytes;
  header->wav_size = bytes+sizeof(wave_header)-8;
  if(header->wav_size&1)
    header->wav_size++;
  return bytes;
};

bool fix_lame(
  wave_data* wave
){
  short RI = *((short*)"RI");
  short FF = *((short*)"FF");
  short WA = *((short*)"WA");
  short VE = *((short*)"VE");
  int size = wave->bytes;
  short* test;
  int i;
  if(size<2048)
    return false;
  size &= ~1;
  size -= 12;
  test = (short*)(wave->buffer)+(size>>1);
  for(i=0; i<1024; i+=2){
    if(
      test[0]==RI &&
      test[1]==FF &&
      test[4]==WA &&
      test[5]==VE
    ){
     wave->bytes = size;
     return true;
   }
   test--;
   size -= 2;
  }
  return false;
}

void print_time(
  int sample,
  int rate,
  char* string
){
  int sec = (sample/rate)|0;
  int min = (sec/60)|0;
  int msc = ((int)(1.0*(sample%rate)/rate*100000))|0;
  sec = (sec%60)|0;
  sprintf(string,"%d:%02d.%05d",min,sec,msc);
};

int read_all(
  FILE* stream,
  void* buffer[]
){
  void** parts_array;
  int one_part = 8*1024*1024;
  int total_parts = 256;
  int bytes;
  int result;
  int i;
  int to_read;
  int have_read;
  void* copy_to;
  void* copy_from;
  parts_array = (void**)calloc(total_parts,sizeof(void*));
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
    *buffer = NULL;
    for(i=0; i<total_parts; i++)
      if(parts_array[i])
        free(parts_array[i]);
      else
        break;
    free(parts_array);
    return -bytes;
  }
  *buffer = copy_to;
  result = bytes;
  for(i=0; i<total_parts; i++){
    copy_from = parts_array[i];
    if(!copy_from)
      break;
    to_read = one_part;
    if(bytes<one_part)
      to_read = bytes;
    memcpy(copy_to,copy_from,to_read);
    copy_to = ((char*)copy_to)+to_read;
    free(parts_array[i]);
    bytes -= to_read;
  }
  free(parts_array);
  return result;
}

bool read_wave(
  wave_data* wave,
  FILE* stream,
  FILE* logger
){
  int known_length;
  bool is_stereo;
  bool is_16bit;
  char time[32] = {0}; 
  if(!check_header(
    &wave->header,
    &is_stereo,
    &is_16bit,
    &wave->rate,
    &known_length
  )){
    if(logger){
      fprintf(logger,"Your WAVE is not supported!\n");
      fflush(logger);
    }
    return false;
  }
  if(logger){
    fprintf(
      logger,
      "WAVE: %d bit %s (%d Hz),",
      is_16bit ? 16 : 8,
      is_stereo ? "stereo" : "mono",
      wave->rate
    );
    fflush(logger);
  }
  if(known_length>0){
    wave->buffer = malloc(known_length);
    if(!wave->buffer){
      if(logger){
        fprintf(logger,"\nOut of memory! (Need %d Mb)\n",known_length>>20);
        fflush(logger);
      }
      return false;
    }
    wave->bytes = read_file(stream,wave->buffer,known_length);
    if(wave->bytes!=known_length){
      if(logger){
        fprintf(
          logger,
          "\nProbably a read error (size should be %d)...\n",
          known_length
        );
        fflush(logger);
      }
    }
  }else{
    if(logger){
      fprintf(
        logger,
        "\nBad size in RIFF header..."
      );
      fflush(logger);
    }
    wave->bytes = read_all(stream,&wave->buffer);
    if(wave->bytes<0){
      if(logger){
        fprintf(logger,"\nOut of memory! (Need 2*%d Mb)\n",-wave->bytes);
        fflush(logger);
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
      fflush(logger);
    }
  if(is_stereo){
    if(is_16bit){
      wave->bytes = wave->bytes&~3;
      wave->length = wave->bytes>>2;
      wave->shift = 2;
    }else{
      wave->bytes = wave->bytes&~1;
      wave->length = wave->bytes>>1;
      wave->shift = 1;
    }
  }else{
    if(is_16bit){
      wave->bytes = wave->bytes&~1;
      wave->length = wave->bytes>>1;
      wave->shift = 1|4;
    }else{
      wave->length = wave->bytes;
      wave->shift = 0;
    }
  }
  print_time(wave->length,wave->rate,time);
  if(logger){
    fprintf(logger," bytes: %d, length: %s\n",wave->bytes,time);
    fflush(logger);
  }
  return true;
};

bool save_wave(
  wave_data* wave,
  FILE* stream,
  int from,
  uint count
){
  int zero = 0;
  int shift = wave->shift&3;
  int bytes;
  bytes = update_header(&wave->header,count);
  if(bytes<1)
    return false;
  count <<= shift;
  from <<= shift;
  if(write_file(
    stream,
    &wave->header,
    sizeof(wave_header)
  )!=sizeof(wave_header))
    return false;
  if(write_file(stream,((char*)wave->buffer)+from,count)!=count)
    return false;
  if(bytes&1)
    write_file(stream,&zero,1);
  fflush(stream);
  return true;
};

uint isqrt(
  uint x
){
// https://stackoverflow.com/questions/1100090/looking-for-an-efficient-integer-square-root-algorithm-for-arm-thumb2
// https://stackoverflow.com/a/1101217
  uint op = x;
  uint res = 0;
  uint one = 1<<30;
  while(one>op)
    one >>= 2;
  while(one){
    if(op>=res+one){
      op = op-(res+one);
      res = res+2*one;
    }
    res >>= 1;
    one >>= 2;
  }
  //if(op>res)
  //  res++;
  return res;
};

uint compute_primes(
    uint array[],
    uint count,
    uint largest,
    bool one_too
  ){
// https://stackoverflow.com/questions/5200879/printing-prime-numbers-from-1-through-100
// https://stackoverflow.com/a/5200931
  uint prime;
  uint i;
  uint have;
  uint root;
  uint from;
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
    root = isqrt(prime);
    for(i=from; i<have && array[i]<=root; i++)
      if(prime%array[i]==0){
        have--;
        break;
      }
    have++;
  }
  return have;
};

uint count_primes(
  uint value
){
  // https://en.wikipedia.org/wiki/Prime-counting_function#Inequalities
  if(value<2)
    return 2;
  return (((int)(1.25506*value/log(value)))+1)|0;
};

float samp_16stereo(
  void* buffer,
  int index
){
  short V;
  float L,R;
  index <<= 1;
  V = ((short*)buffer)[index];
  L = V>0 ? (float)V/0x7fff : (float)V/0x8000;
  V = ((short*)buffer)[index+1];
  R = V>0 ? (float)V/0x7fff : (float)V/0x8000;
  return (L+R)/2;
};

float samp_8stereo(
  void* buffer,
  int index
){
  int V;
  float L,R;
  index <<= 1;
  V = ((int)((uchar*)buffer)[index])-0x80;
  L = V>0 ? (float)V/0x7f : (float)V/0x80;
  V = ((int)((uchar*)buffer)[index+1])-0x80;
  R = V>0 ? (float)V/0x7f : (float)V/0x80;
  return (L+R)/2;
};

float samp_16mono(
  void* buffer,
  int index
){
  short V;
  float C;
  V = ((short*)buffer)[index];
  C = V>0 ? (float)V/0x7fff : (float)V/0x8000;
  return C;
};

float samp_8mono(
  void* buffer,
  int index
){
  int V;
  float C;
  V = ((int)((uchar*)buffer)[index])-0x80;
  C = V>0 ? (float)V/0x7f : (float)V/0x80;
  return C;
};

void display_wave(
  wave_data* wave,
  FILE* logger
){
  int total = 78;
  int lines = 16;
  int values[78*16] = {0};
  char send[78+2];
  int scale = 6;
  char* disp = " .+*xX#?";
  int i,j;
  int from;
  int up;
  int to;
  int size;
  int use;
  int row;
  float samp;
  float prev;
  int shift = wave->shift;
  void* buffer = wave->buffer;
  for(j=0; j<total; j++){
    row = j*lines;
    from = ((int)((1.0*j/total)*wave->length))|0;
    to = ((int)((1.0*(j+1)/total)*wave->length))|0;
    size = 0;
    prev = 0.0;
    up = 0;
    use = 0;
    switch(shift){
      #undef branch
      #define branch(sampler) \
      { \
        for(i=from; i<to; i++){ \
          samp = sampler(buffer,i); \
          if(i>from){ \
            if(up>0){ \
              if(samp<prev){ \
                up = -1; \
                use = 1; \
              } \
            }else if(up<0){ \
              if(samp>prev){ \
                up = -1; \
                use = 1; \
              } \
            }else{ \
              if(samp>prev) \
                up = 1; \
              else if(samp<prev) \
                up = -1; \
            } \
          } \
          if(use){ \
            if(prev<0) \
              prev = -prev; \
            prev = sqrt(prev*1.5); \
            if(prev>1) \
              prev = 1; \
            use = ((int)(prev*(lines-1)))|0; \
            if(++values[row+use]>size) \
              size = values[row+use]; \
            use = 0; \
          } \
          prev = samp; \
        } \
      }
      case 0:
        branch(samp_8mono);
      break;
      case 1:
        branch(samp_8stereo);
      break;
      case 2:
        branch(samp_16stereo);
      break;
      default:
        branch(samp_16mono);
      break;
      #undef branch
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
  send[total] = '\n';
  send[total+1] = '\0';
  for(i=lines-2; i>=0; i--){
    for(j=0; j<total; j++)
      send[j] = disp[values[j*lines+i]];
    fprintf(logger,"%s",send);
  }
  fflush(logger);
};

float normalize_diff(
  float total_diff,
  int number
){
  if(number<1)
    return 0.0;
  return sqrt(total_diff/number)*100;
};

#define diff_16stereo ( \
  (V = ((short*)(buffer))[I1 <<= 1]), \
  (L = V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (V = ((short*)(buffer))[I1+1]), \
  (R = V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (V = ((short*)(buffer))[I2 <<= 1]), \
  (L -= V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (V = ((short*)(buffer))[I2+1]), \
  (R -= V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (L*L+R*R) \
)

#define diff_8stereo ( \
  (V = ((short)((uchar*)buffer)[I1 <<= 1])-0x80), \
  (L = V>0 ? (float)V/0x7f : (float)V/0x80), \
  (V = ((short)((uchar*)buffer)[I1+1])-0x80), \
  (R = V>0 ? (float)V/0x7f : (float)V/0x80), \
  (V = ((short)((uchar*)buffer)[I2 <<= 1])-0x80), \
  (L -= V>0 ? (float)V/0x7f : (float)V/0x80), \
  (V = ((short)((uchar*)buffer)[I2+1])-0x80), \
  (R -= V>0 ? (float)V/0x7f : (float)V/0x80), \
  (L*L+R*R) \
)

#define diff_16mono ( \
  (V = ((short*)buffer)[I1]), \
  (L = V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (V = ((short*)buffer)[I2]), \
  (L -= V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (L*L) \
)

#define diff_8mono ( \
  (V = ((short)((uchar*)buffer)[I1])-0x80), \
  (L = V>0 ? (float)V/0x7f : (float)V/0x80), \
  (V = ((short)((uchar*)buffer)[I2])-0x80), \
  (L -= V>0 ? (float)V/0x7f : (float)V/0x80), \
  (L*L) \
)

float diff_wave(
  wave_data* wave,
  int first,
  int second,
  int count,
  int step
){
  void* buffer = wave->buffer;
  float diff = 0.0;
  int i;
  short V;
  float L,R;
  int I1,I2;
  if(step<1)
    return diff;
  switch(wave->shift){
    #undef branch
    #define branch(comparator) \
    { \
      if(count>0) \
        for(i=0; i<count; i+=step){ \
          I1 = first+i; \
          I2 = second+i; \
          diff += comparator; \
        } \
      else \
        for(i=0; i>count; i-=step){ \
          I1 = first+i; \
          I2 = second+i; \
          diff += comparator; \
        } \
    }
    case 0:
      branch(diff_8mono);
    break;
    case 1:
      branch(diff_8stereo);
    break;
    case 2:
      branch(diff_16stereo);
    break;
    default:
      branch(diff_16mono);
    break;
    #undef branch
  }
  return diff;
};

#undef diff_8mono
#undef diff_8stereo
#undef diff_16stereo
#undef diff_16mono

#define zero_16stereo ( \
  (V = ((short*)buffer)[I <<= 1]), \
  (L = V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (V = ((short*)buffer)[I+1]), \
  (R = V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (L*L+R*R) \
)

#define zero_8stereo ( \
  (V = ((short)((uchar*)buffer)[I <<= 1])-0x80), \
  (L = V>0 ? (float)V/0x7f : (float)V/0x80), \
  (V = ((short)((uchar*)buffer)[I+1])-0x80), \
  (R = V>0 ? (float)V/0x7f : (float)V/0x80), \
  (L*L+R*R) \
)

#define zero_16mono ( \
  (V = ((short*)buffer)[I]), \
  (L = V>0 ? (float)V/0x7fff : (float)V/0x8000), \
  (L*L) \
)

#define zero_8mono ( \
  (V = ((short)((uchar*)buffer)[I])-0x80), \
  (L = V>0 ? (float)V/0x7f : (float)V/0x80), \
  (L*L) \
)

int seek_zero(
  wave_data* wave,
  int radius,
  int where
){
  void* buffer = wave->buffer;
  float current;
  float smallest = -1;
  int shift = 0;
  int walk;
  short V;
  float L,R;
  int I;
  switch(wave->shift){
    #undef branch
    #define branch(zerotest) \
    { \
      for(walk=-radius; walk<=radius; walk++){ \
        I = where+walk; \
        current = zerotest; \
        if(current<smallest || smallest<0){ \
          smallest = current; \
          shift = walk; \
        } \
      } \
    }
    case 0:
      branch(zero_8mono);
    break;
    case 1:
      branch(zero_8stereo);
    break;
    case 2:
      branch(zero_16stereo);
    break;
    default:
      branch(zero_16mono);
    break;
    #undef branch
  }
  return shift;
};

#undef zero_8mono
#undef zero_8stereo
#undef zero_16stereo
#undef zero_16mono

int seek_boundary(
  wave_data* wave,
  int point_in,
  int length_of
){
  int length = wave->length;
  int area = (length/1000)|0;
  int first = point_in;
  int second = point_in+length_of;
  int move_left = 0;
  int move_right = 0;
  float diff_left = -1;
  float diff_right = -1;
  int size_compare;
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

uint perm_16stereo(
  void* buffer,
  int index,
  uint* sample
){
  uint temp = ((uint*)buffer)[index];
  if(sample)
    ((uint*)buffer)[index] = *sample;
  return temp;  
};

uint perm_8stereo(
  void* buffer,
  int index,
  uint* sample
){
  ushort temp = (uint)(((ushort*)buffer)[index]);
  if(sample)
    ((ushort*)buffer)[index] = *((ushort*)sample);
  return (uint)temp;  
};

uint perm_16mono(
  void* buffer,
  int index,
  uint* sample
){
  ushort temp = (uint)(((ushort*)buffer)[index]);
  if(sample)
    ((ushort*)buffer)[index] = *((ushort*)sample);
  return (uint)temp;  
};

uint perm_8mono(
  void* buffer,
  int index,
  uint* sample
){
  uchar temp = (uint)(((uchar*)buffer)[index]);
  if(sample)
    ((uchar*)buffer)[index] = *((uchar*)sample);
  return (uint)temp;
};

void swap_halves(
  wave_data* wave,
  int from,
  int size
){
  void* buffer = wave->buffer;
  int half;
  int i;
  int a,b;
  uint one,two,tmp;
  if(size<2)
    return;
  half = size >> 1;
  a = from;
  b = from+half;
  switch(wave->shift){
    #undef branch
    #define branch(permutator) \
    { \
      if(!(size&1)) \
        for(i=0; i<half; i++){ \
          one = permutator(buffer,a,NULL); \
          two = permutator(buffer,b,&one); \
          permutator(buffer,a,&two); \
          a++; \
          b++; \
        } \
      else{ \
        tmp = permutator(buffer,size-1,NULL); \
        for(i=0; i<half; i++){ \
          one = permutator(buffer,a,NULL); \
          two = permutator(buffer,b,&tmp); \
          permutator(buffer,a,&two); \
          tmp = one; \
          a++; \
          b++; \
        } \
        permutator(buffer,size-1,&tmp); \
      } \
    }
    case 0:
      branch(perm_8mono);
    break;
    case 1:
      branch(perm_8stereo);
    break;
    case 2:
      branch(perm_16stereo);
    break;
    default:
      branch(perm_16mono);
    break;
    #undef branch
  }
};

void move_samples(
  wave_data* wave,
  int from,
  int size,
  int to
){
  int shift = wave->shift&3;
  from <<= shift;
  size <<= shift;
  to <<= shift;
  memmove(
    ((char*)wave->buffer)+to,
    ((char*)wave->buffer)+from,
    size
  );
};

bool save_repeat(
    wave_data* wave,
    int begin,
    int end,
    FILE* outfile,
    FILE* loopfile
  ){
  int length = wave->length;
  int size = end-begin;
  bool success = true;
  if(loopfile){
    swap_halves(wave,begin,size);
    if(!save_wave(wave,loopfile,begin,size))
      success = false;
  }
  if(outfile){
    move_samples(wave,end,length-end,begin);
    if(!save_wave(wave,outfile,0,length-size))
      success = false;
  }
  return success;
};

int guess_length(
  wave_data* wave,
  int starting_point,
  uint primes[],
  int primes_size,
  uint temp_int[],
  float temp_float[],
  bool reverse
){
  int length = wave->length;
  int from;
  int last;
  int size;
  uint* candidates = temp_int;
  float best = -1;
  float test;
  float ever;
  float mean;
  int have = 0;
  int take;
  uint step;
  uint prime_index;
  int i;
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

typedef struct {
  int from;
  int size;
} array_finder;

void finder_add(
  array_finder* finder,
  int from,
  int size
){
  int i;
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

float finder_use(
  wave_data* wave,
  array_finder* finder,
  int* begin,
  int* end,
  int* find,
  FILE* logger
){
  int i,j;
  int length_from = finder[0].from;
  int length_size = finder[0].size;
  int temp;
  int zone;
  int from;
  int size;
  int radius = (wave->length/2000)|0;
  float diff;
  float best;
  int best_from = 0;
  int best_size = 0;
  int first;
  int second;
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
    fprintf(logger,"Refining: %2d x %-2d...  ",length_from,length_size);
    fflush(logger);
  }
  *find = length_from+length_size;
  best = -1;
  for(j=1; j<=length_size; j++){
    size = finder[j].size;
    zone = (size/3)|0;
    for(i=1; i<=length_from; i++){
      from = finder[i].from;
      if(from-zone<0 || from+size+zone>=wave->length)
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
    fprintf(logger,"START: %-10d ",best_from);
    fflush(logger);
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
    else if(second>=wave->length)
      first -= second+1-wave->length;
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
      *begin = from;
      *end = from+size;
    }
  }
  if(logger){
    fprintf(logger,"END: %-10d SIZE: %-10d\n",*end,*end-*begin);
    fflush(logger);
  }
  return best;
};

float find_repeat(
  wave_data* wave,
  int* cut_from,
  int* cut_to,
  int* find,
  FILE* logger
){
  int length = wave->length;
  int loop_test;
  int loop_length;
  int loop_start;
  int loop_middle;
  int seek_from = (length/8)|0;
  int seek_to = (length/2)|0;
  int seek_step = (length/16)|0;
  int seek;
  int seek_curr;
  int reverse;
  int loop_curr;
  int total_memory;
  uint* integer_array;
  float* float_array;
  uint* primes_array;
  uint primes_length;
  int half_length = (length/2)|0;
  array_finder finder[16];
  finder[0].from = 0;
  finder[0].size = 0;
  primes_length = count_primes(half_length);
  integer_array = (uint*)malloc(sizeof(uint)*half_length);
  float_array = (float*)malloc(sizeof(float)*half_length);
  primes_array = (uint*)malloc(sizeof(uint)*primes_length);
  total_memory =
    sizeof(uint)*half_length +
    sizeof(float)*half_length +
    sizeof(uint)*primes_length +
    wave->bytes;
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
      ((int)(1.0*total_memory/(1024*1024)+0.5))|0,
      MY_ENVIRONMENT
    );
    fflush(logger);
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
          "%10d%c",
          loop_length,
          loop_curr%7 ? ' ' : '\n'
        );
        fflush(logger);
      }
    }
  }
  free(primes_array);
  free(integer_array);
  free(float_array);
  return finder_use(
    wave,
    finder,
    cut_from,
    cut_to,
    find,
    logger
  );
};

void draw_cut(
  wave_data* wave,
  int begin,
  int end,
  FILE* logger
){
  int i;
  int from;
  int to;
  int width = 78;
  char draw[78+2];
  from = ((int)(1.0*begin/wave->length*width+0.5))|0;
  to = ((int)(1.0*end/wave->length*width+0.5))|0;
  for(i=0; i<width; i++)
    if(i>from && i<to)
      draw[i] = '$';
    else if(i==from || i==to)
      draw[i] = '|';
    else
      draw[i] = '-';
  draw[width] = '\n';
  draw[width+1] = '\0';
  fprintf(logger,"%s",draw);
  fflush(logger);
};

const char* calc_grade(
  int finder,
  float diff,
  float percent
){
  const char* res;
  int grade = 0;
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

bool algo_work(
  FILE* file_in,
  FILE* file_out,
  FILE* file_loop,
  FILE* logger
){
  float diff;
  float perc;
  int find;
  const char* grade;
  bool success = true;
  wave_data wave;
  clock_t time_begin;
  clock_t time_end;
  int cut_begin = -1;
  int cut_end = -1;
  char sec_begin[32] = {0};
  char sec_end[32] = {0};
  char sec_size[32] = {0};
  if(!read_header(
    &wave.header,
    file_in
  )){
    if(logger){
      fprintf(
        logger,
        "Input file read error or invalid WAVE format!\n"
      );
      fflush(logger);
    }
    return false;
  }
  if(!read_wave(&wave,file_in,logger))
    return false;
  if(wave.length<5000){
    if(logger){
      fprintf(logger,"The file is too small!\n");
      fflush(logger);
    }
    return false;
  }
  if(logger)
    display_wave(&wave,logger);
  time_begin = clock();
  diff = find_repeat(
    &wave,
    &cut_begin,
    &cut_end,
    &find,
    logger
  );
  time_end = clock();
  print_time(cut_begin,wave.rate,sec_begin);
  print_time(cut_end,wave.rate,sec_end);
  print_time(cut_end-cut_begin,wave.rate,sec_size);
  perc = 100.0*(cut_end-cut_begin)/wave.length;
  grade = calc_grade(find,diff,perc);
  if(logger){
    draw_cut(&wave,cut_begin,cut_end,logger);
    fprintf(
      logger,
      "Cut: %s - %s = -%s (-%.1f%%), diff = %.3f\n",
      sec_begin,
      sec_end,
      sec_size,
      perc,
      diff
    );
    fprintf(
      logger,
      "Algorithm took %.2f sec. Your grade of quality: %s ...",
      1.0*(time_end-time_begin)/CLOCKS_PER_SEC,
      grade
    );
    fflush(logger);
  }
  if(file_out||file_loop){
    success = save_repeat(&wave,cut_begin,cut_end,file_out,file_loop);
    if(logger){
      fprintf(
        logger,
        " saving: %s!\n",
        success ? "success" : "ERROR"
      );
      fflush(logger);
    }
  }else if(logger){
    fprintf(logger," done!\n");
    fflush(logger);
  }
  free(wave.buffer);
  return success;
};

FILE* open_file(
  const char* base,
  const char* add,
  const char* prompt,
  FILE* logger
){
  FILE* result;
  const char* oldext = ".old";
  bool removed;
  bool renamed;
  int both =  strlen(base)+strlen(add)+strlen(oldext)+4;
  char* name = (char*)calloc(both,1);
  char* temp = (char*)calloc(both,1);
  strcat(name,base);
  strcat(name,add);
  strcat(temp,name);
  strcat(temp,oldext);
  removed = (remove(temp)==0);
  renamed = (rename(name,temp)==0);
  result = fopen(name,"w");
  if(!result){
    if(renamed)
      rename(temp,name);
    if(logger){
      fprintf(logger,"%s \"%s\" open error!\n",prompt,name);
      fflush(logger);
    }
    return NULL;
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
    fflush(logger);
  }
  free(name);
  free(temp);
  return result;
};

int console_wait(
  int wait,
  FILE* infile,
  FILE* outfile,
  FILE* loopfile
){
  char cwait;
  const char* Wait = "=== Press ENTER to exit ===";
  if(!wait)
    return 1;
  if(infile)
    fclose(infile);
  if(outfile)
    fclose(outfile);
  if(loopfile)
    fclose(loopfile);
  fprintf(stdout,"%s",Wait);
  fflush(stdout);
  if(wait!=2){
    fprintf(stderr,"%s",Wait);
    fflush(stderr);
  }
  scanf("%c",&cwait);
  return 1;
}

int_ main(
  int_ argc,
  char* argv[]
){
  int wait;
  bool succ;
  const char* Source = "Source";
  const char* Output = "Output";
  const char* Repeat = "Repeat";
  FILE* infile = NULL;
  FILE* outfile = NULL;
  FILE* loopfile = NULL;
  FILE* logger = stderr;
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
    return console_wait(2,infile,outfile,loopfile);
  }
  if(argc>1 && !strcmp(argv[1],"-")){
    infile = stdin;
    wait = 0;
  }
  if(argc>2 && !strcmp(argv[2],"-"))
    outfile = stdout;
  if(argc>3 && !strcmp(argv[3],"-")){
    if(outfile){
      loopfile = stderr;
      logger = NULL;
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
    fflush(logger);
  }
  if(!infile){
    infile = fopen(argv[1],"r");
    if(!infile){
      if(logger)
        fprintf(logger,"Input file open error!\n");
      return console_wait(wait,infile,outfile,loopfile);
    }
    if(argc<3){
      outfile = open_file(argv[1],".out.wav",Output,logger);
      if(outfile)
        loopfile = open_file(argv[1],".loop.wav",Repeat,logger);
      if(!loopfile || !outfile)
        return console_wait(wait,infile,outfile,loopfile);
    }
  }
  if(!outfile && argc>2){
    outfile = open_file(argv[2],"",Output,logger);
    if(!outfile)
      return console_wait(wait,infile,outfile,loopfile);
  }else if(!outfile || outfile==stdout){
    if(logger){
      fprintf(
        logger,
        "%s: \"%s\"\n",
        Output,
        outfile ? "<stdout>" : "<null>"
      );
      fflush(logger);
    }
  }
  if(!loopfile && argc>3){
    loopfile = open_file(
      argv[3],
      "",
      Repeat,
      logger
    );
    if(!loopfile)
      return console_wait(wait,infile,outfile,loopfile);
  }else if(!loopfile || loopfile==stdout){
    if(logger){
      fprintf(
        logger,
        "%s: \"%s\"\n",
        Repeat,
        loopfile ? "<stdout>" : "<null>"
      );
      fflush(logger);
    }
  }
  #ifdef _WIN32
    if(infile)
      setmode(fileno(infile),O_BINARY);
    if(outfile)
      setmode(fileno(outfile),O_BINARY);
    if(loopfile)
      setmode(fileno(loopfile),O_BINARY);
  #endif
  succ = algo_work(infile,outfile,loopfile,logger);
  console_wait(wait,infile,outfile,loopfile);
  return !succ;
};

//EOF