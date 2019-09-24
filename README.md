(if you want to link to this project, use this canonical URL: [https://github.com/klimaleksus/RepeatRemove/](https://github.com/klimaleksus/RepeatRemove/) )

## RepeatRemove v1.2, by Kly_Men_COmpany!

Online demo: **[https://klimaleksus.github.io/RepeatRemove/browser/repeat_remove.htm]( https://klimaleksus.github.io/RepeatRemove/browser/repeat_remove.htm)**

_To download the standalone program, just [clone](https://github.com/klimaleksus/RepeatRemove/archive/master.zip) this repository._

### What is this?

Well, that was a cute little program that could process a WAVE music file, to find and cut one repeated part from it.

To be qualified as a "repeat", that part of music should be big (20%-50% of length), and must be directly connected with itself. Original beginning and ending (which is most important!) are preserved, so only one loop itself will be deleted.

The algorithm is fuzzy, so exact sample-perfect equality of two loops is not required. But on success, you will have a track with really sample-perfect cut, which is faster than finding it manually.

### How to use it?

This program is written in C language, and ported to Javascript. It can run standalone both on Windows and on Linux, and executed as a sole script in NodeJS (without any dependencies). Online demo here uses WebWorkers version, and provides slightly modified async version for running directly from browser GUI thread. (Note that provided standalone system binaries are much faster than online JS version).

Just take "repeat_remove.exe" (Win32) or "./repeat_remove" (Unix) and run it in terminal console. You will see this helpfile:

```
RepeatRemove v1.2, by Kly_Men_COmpany!  (License: WTFPL)  Usage:
  repeat_remove "in.wav" "out.wav" "loop.wav"   [general mode, full control]
  repeat_remove "in.wav" "out.wav"   [skipping debug loop output]
  repeat_remove "in.wav"   [assumed "in.wav.out.wav" and "in.wav.loop.wav"]
  repeat_remove - <"in.wav"   [outputs are ignored, logging-only mode]
  repeat_remove - - <"in.wav" >"out.wav"   [piping mode, no loop output]
  repeat_remove - - - <"in.wav" >"out.wav" 2>"loop.wav"   [no stderr logging]
Supports one file Shell drag-and-drop. Piping MP3 via LAME or FLAC via FFMPEG:
  lame --decode in.mp3 - | repeat_remove - - | lame --preset extreme - out.mp3
  ffmpeg -i in.flac -f wav - | repeat_remove - - | ffmpeg -y -i - out.flac
This program will process WAVE music file - to find there a "repeat".
That's a loop of the exact same moment, repeated twice or more.
You will have another .wav output file without that loop (precisely cut),
and optionally the loop itself, with swapped halves (so you could examine it).
To work properly, this program implies some rules. Make sure that:
 1) Your file actually has the repeat! Otherwise, an output will be broken;
 2) The length of the intro before the loop, and the finale after -
    are not larger than one repeat length. So, the looped part should be big;
 3) Wave file has more than 5000 samples, but also not larger than 200-450 Mb;
 4) Your file contains real music: not a complete silence, noise or signals.
If you have three or more loops, be prepared to invoke this program
several times, manually checking the quality of intermediate cuttings.
```

You should run this program from command line terminal, supplying your filenames. (Also, you can drag-and-drop ONE .wav file to this .exe in Explorer on Windows).

Or, you might want to write your own little shell script to batch-process several files (especially when piping is involved, since this program accepts only bare WAVE data, but with correct headers).

### Where are binaries?

Right here, in this repository. You should use files in "windows" and "linux" folders, they are compiled with maximal optimizations (and require SSE2). For some reason, you may use ones from "legacy" subfolders, but they are slower.

For NodeJS version, use script from "nodejs" folder, and invoke it as `node repeat_remove.js …`. Do not require() it, since it could be used only as a standalone synchronous script! Don't use "legacy" version there either, since it is suitable only for this online demo in browsers.

To quickly check this program, you might want to invoke in on "test.wav" file here. The output will look like this:

```
RepeatRemove v1.2!
Source: "test.wav"
Output: "test.wav.out.wav"
Repeat: "test.wav.loop.wav"
WAVE: 8 bit mono (8000 Hz), bytes: 6912, length: 0:00.86400
                     ++    . ***+  x    X+.    +     x#*x    x    #*
                     #+    #x##**  .    ##*   .+    x*+x#*.  x    **
                     x.   *x# x#** +.   x#x   #+*x +x#*+x*+  *   .+x#
                     +#+* x.X x.** x   .**#.  ####.+#*x+#xX  +.. ..X*
                     +X##.#+ X+##x #*. +.**   *#x+++*+**x#+ **.X ++**
                   *+++++.#*  *#*+.+ #.+....  #+. +X .+#++#.*+ ++.+#.
                   + +xx.** x++x.##+*#*.+*+.+.*+x#+#++ +**+x####+x. *#
                   *+.X+x.#.+*.x+*#*#xx#.* #*xX.+x#x+ .. **.**.+x*..+x
                   ##.x **.. *..*X+*.xX+.**+x*++#x.*++  x**+#x.x+# + .
                   x# +X+#+  ...+### . .  .+#+x.+.+*.  .x x#*.*.#  *..
                   X+ +++++   .+****+ #+ . .*#* .*+ . ..+ X+*x++++   +
                   xx+*. *#    ++*+x*++.+  .*+. x.+*..    * +++*+.. ..
                   *+.+  .+    +.++.*.+.   .x++.* +.  .   X..*. *    +
             **#### x + . .  .  +*   .      +..   +    .  .* *  +    .##
             ##+#+X              .  +          ..       . +          .+x
Total samples: 6912, memory used: 0 Mb, environment: Win32
      2011       2318       1694       2275       2247       2238       2238
      2247       2238       2247       2274       1738       2347       1808
Refining: 12 x 10...  START: 2452       END: 4690       SIZE: 2238
----------------------------|$$$$$$$$$$$$$$$$$$$$$$$$|------------------------
Cut: 0:00.30650 - 0:00.58625 = -0:00.27975 (-32.4%), diff = 27.313
Algorithm took 0.11 sec. Your grade of quality: E  ... saving: success!
=== Press ENTER to exit ====== Press ENTER to exit ===
```

### What all of these mean? Is there a detailed documentation?

Um… nope. You see, on a first thought, I believed that this program is very cool. I could remove an extra repeats on musical tracks (especially game OST), that have a structure like this: intro+loop+loop+loop+…

So, on the first iteration, this program removes one or two repeats. Then another one, until I am satisfied. But then I realized that I can deal with this issue just by manually cutting the track on the second repeat, and simply applying "fade-out" on last few seconds. This will not preserve the "original ending" of the file, but in 10 times from 10, I actually didn't need that anyway!

It means that this program is actually useless. If you find any reasonable use-case for it – feel free to use it anyhow. Since I will not publish any other documentation, API, nor source code comments (because no "average" user would ever need this program) – you can contact me by e-mail (`aleksusklim@gmail.com`) if you have further questions.

### To-do (no)

- Native support for 64-bit systems;
- Support for big-endian systems;
- Optimizing: use float samples array for intermediate calculations;
- Processing of raw PCM data;
- Configurable options from command-line (quality, iteration count);
- Ability to cut several repeats;
- Unicode support for filenames;

### EOF