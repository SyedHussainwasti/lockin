// ==APP-LOGIC-START==

// Makes a new timer. workMin = work minutes, breakMin = break minutes.
function Pomodoro(workMin, breakMin){
  this.workMs = workMin*60000; // work length, changed into milliseconds
  this.breakMs = breakMin*60000; // break length, changed into milliseconds
  this.reset(); // set everything to the starting state
}

// Puts the timer back to the starting state.
Pomodoro.prototype.reset = function(){
  this.phase='idle'; // idle means "not started yet"
  this.remaining=this.workMs; // full work time still left
  this.cycles=0; // no finished work sessions yet
  this.running=false; // the clock is not ticking
  this.endAt=0; // no finish time set
};

// Changes the work/break lengths (from the settings boxes).
Pomodoro.prototype.setLengths = function(wMin,bMin){
  this.workMs=Math.max(1,wMin)*60000; // at least 1 minute, in milliseconds
  this.breakMs=Math.max(1,bMin)*60000; // at least 1 minute, in milliseconds
  // If the timer hasn't started, update the time shown.
  if(this.phase==='idle'){this.remaining=this.workMs;}
  // If paused mid-work, update the paused work time.
  else if(this.phase==='work'&&!this.running){this.remaining=this.workMs;}
  // If paused mid-break, update the paused break time.
  else if(this.phase==='break'&&!this.running){this.remaining=this.breakMs;}
};

// Starts (or resumes) the clock. "now" is the current time.
Pomodoro.prototype.start = function(now){
  if(this.running) return; // already running? do nothing
  this.running=true; // the clock is ticking now
  if(this.phase==='idle') this.phase='work'; // first start always begins a work session
  this.endAt=now+this.remaining; // remember when this session should finish
};

// Pauses the clock. "now" is the current time.
Pomodoro.prototype.pause = function(now){
  if(!this.running) return; // not running? do nothing
  this.remaining=Math.max(0,this.endAt-now); // save how much time was left
  this.running=false; // the clock stops ticking
};

// Called often while running. Moves to the next phase when time runs out.
// Returns 'phaseChange' on a switch, otherwise null.
Pomodoro.prototype.tick = function(now){
  if(!this.running) return null; // not running? nothing to do
  this.remaining=this.endAt-now; // how much time is left right now
  if(this.remaining<=0){ // time ran out!
    // Work just ended: switch to break and count one finished session.
    if(this.phase==='work'){this.phase='break';this.cycles++;this.remaining=this.breakMs;}
    // Break just ended: switch back to work.
    else{this.phase='work';this.remaining=this.workMs;}
    this.endAt=now+this.remaining; // set the finish time for the new phase
    return 'phaseChange'; // tell the caller a switch happened
  }
  return null; // no switch, keep going
};

// How far through the current session we are, as 0 to 1 (for the ring).
Pomodoro.prototype.progress = function(){
  // Pick the full length of the current phase (1 if idle, to avoid dividing by zero).
  var total=this.phase==='work'?this.workMs:(this.phase==='break'?this.breakMs:1);
  if(!total) return 0; // safety: no length means no progress
  // 1 minus (time left / full time), kept between 0 and 1.
  return Math.min(1,Math.max(0,1-this.remaining/total));
};

// Turns milliseconds into a "MM:SS" clock string.
function fmtClock(ms){
  ms=Math.max(0,ms); // never show a negative time
  var totalSec=Math.ceil(ms/1000); // whole seconds, rounded up
  var m=Math.floor(totalSec/60), s=totalSec%60; // split into minutes and seconds
  // Add a leading zero when needed, e.g. "05:09".
  return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}
// ==APP-LOGIC-END==

// Everything below only runs in a browser (not when testing the logic in Node).
if(typeof document!=='undefined'){
  var R=100, CIRC=2*Math.PI*R; // ring radius and its full circle length
  // Grab the page pieces we need: the ring, the time text, the phase label,
  // the start button, the session counter, and the two settings boxes.
  var ring=document.getElementById('ringFg');
  var timeEl=document.getElementById('time');
  var phaseEl=document.getElementById('phase');
  var startBtn=document.getElementById('startBtn');
  var cycleEl=document.getElementById('cycleCount');
  var workLen=document.getElementById('workLen');
  var breakLen=document.getElementById('breakLen');
  // Set up the ring: full circle length, starting fully "empty".
  ring.style.strokeDasharray=String(CIRC);
  ring.style.strokeDashoffset=String(CIRC);
  var pomo=new Pomodoro(25,5); // the timer: 25 min work, 5 min break
  var audioCtx=null; // will hold the sound maker, created on first beep
  // Plays two short beeps (high then low) when a phase changes.
  function beep(){
    try{
      // Create the sound maker on first use (browsers need a user click first).
      if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended') audioCtx.resume(); // wake it up if sleeping
      // Two beeps: one now, one a moment later.
      [0,0.35].forEach(function(delay,i){
        var o=audioCtx.createOscillator(), g=audioCtx.createGain(); // tone + volume
        o.connect(g); g.connect(audioCtx.destination); // wire tone to the speakers
        o.type='sine'; o.frequency.value=i===0?880:660; // high beep, then lower beep
        var t=audioCtx.currentTime+delay; // when this beep starts
        g.gain.setValueAtTime(0.001,t); // start silent...
        g.gain.exponentialRampToValueAtTime(0.4,t+0.03); // ... swell up fast...
        g.gain.exponentialRampToValueAtTime(0.001,t+0.3); // ... then fade out
        o.start(t); o.stop(t+0.32); // play the beep
      });
    }catch(e){} // if sound fails, stay silent — never crash the timer
  }
  // Picks the ring color: green for work, blue for break, grey for idle.
  function phaseColor(){
    return pomo.phase==='work'?'var(--work)':(pomo.phase==='break'?'var(--break)':'var(--idle)');
  }
  // Redraws everything on the page from the timer's current state.
  function draw(){
    timeEl.textContent=fmtClock(pomo.remaining); // the big time text
    ring.style.strokeDashoffset=String(CIRC*(1-pomo.progress())); // drain the ring
    ring.style.stroke=phaseColor(); // color the ring for the phase
    // The small label: Ready / Focus / Paused — work / Break / Paused — break.
    phaseEl.textContent=pomo.phase==='idle'?'Ready':(pomo.phase==='work'?(pomo.running?'Focus':'Paused — work'):(pomo.running?'Break':'Paused — break'));
    cycleEl.textContent=String(pomo.cycles); // finished sessions count
    startBtn.textContent=pomo.running?'Pause':'Start'; // button says what it will do
    // While paused mid-session, the start button turns blue.
    startBtn.classList.toggle('paused',!pomo.running&&pomo.phase!=='idle');
  }
  // Five times a second: check the timer, beep on a phase change, redraw.
  setInterval(function(){
    if(pomo.tick(Date.now())==='phaseChange'){beep();}
    draw();
  },200);
  // Start/Pause button: pause if running, else read the settings and start.
  startBtn.addEventListener('click',function(){
    if(pomo.running){pomo.pause(Date.now());}
    else{
      pomo.setLengths(parseInt(workLen.value,10)||25, parseInt(breakLen.value,10)||5);
      pomo.start(Date.now());
    }
    draw();
  });
  // Reset button: read the settings, then put the timer back to the start.
  document.getElementById('resetBtn').addEventListener('click',function(){
    pomo.setLengths(parseInt(workLen.value,10)||25, parseInt(breakLen.value,10)||5);
    pomo.reset();
    draw();
  });
  // When a settings box changes, apply the new lengths right away.
  function applyLengths(){
    pomo.setLengths(parseInt(workLen.value,10)||25, parseInt(breakLen.value,10)||5);
    draw();
  }
  workLen.addEventListener('change',applyLengths);
  breakLen.addEventListener('change',applyLengths);
  draw(); // draw once right away so the page isn't blank
}
