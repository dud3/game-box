// globals

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

// helper

function obj(o) {
  this.o = o || {};
}
obj.prototype.get = function(that) {
  return this.o;
};
obj.prototype.merge = function(v) {
  v = v || {};
  for(var k in v) if(this.o[k] !== undefined) this.o[k] = v[k];

  return this;
}
obj.prototype.bind = function(that) {
  for(var k in this.o) that[k] = this.o[k];

  return this;
};

// Vector 2D

function Vec2(argv) {
  new obj({x: 0, y: 0}).merge(argv).bind(this);
}
Vec2.prototype.set = function(x, y) {
  this.x = x;
  this.y = y;
}

// Collider

function Collider(pos) {
  new obj({pos: new Vec2(pos)}).bind(this);
}
Collider.prototype.check = function() {}

// Rect Collider

function ColliderRect(min, max) {
  Collider.call(this); // Extend

  if (!(min instanceof Vec2) && (max instanceof Vec2)) { console.warn("min or max not Vec2"); return false }

  this.min = min;
  this.max = max;
}
ColliderRect.prototype.check = function(collider) {
  if(!(collider instanceof ColliderRect)) { console.warn('Not a rect collider'); return false; }

  const a = collider;
  const b = this;

  if (a.min.x == a.max.x && a.min.y == a.max.y) {
    const x = a.min.x;
    const y = a.min.y;
    return x > b.min.x && x < b.max.x && y > b.min.y && y < b.max.y;
  }

  return a.max.x > b.min.x && a.min.x < b.max.x && a.max.y >= a.min.y && a.min.y < b.max.y;
}

// Generic entity

function Entity(argv) {
  new obj({pos: new Vec2(argv), dorRender: true, doUpdate: true}).merge(argv).bind(this);
  this.collider = new Collider(this.pos);
}
Entity.prototype.update = function(dt, du) {}
Entity.prototype.render = function() {}
Entity.prototype.onCollision = function() {}

// Entities
// Extending generic entity

function Mouse() {
  Entity.call(this);

  this.callBacks = {
    onClick: () => {}
  };

  this.clickHold = false;

  const bounds = canvas.getBoundingClientRect();
  canvas.addEventListener('mousemove', (e) => {
    this.pos.x = e.clientX - bounds.left;
    this.pos.y = e.clientY - bounds.top;

    this.collider.min.set(this.pos.x, this.pos.y);
    this.collider.max.set(this.pos.x, this.pos.y);
  });
  canvas.addEventListener('click', (e) => {
    this.callBacks.onClick(this);
  });
  canvas.addEventListener('mousedown', (e) => {
    this.clickHold = true;
  });
  canvas.addEventListener('mouseup', (e) => {
    this.clickHold = false;
    this.click = false;
  });

  this.collider = new ColliderRect(this.pos, this.pos);
}
Mouse.prototype.onClick = function(fn) { this.callBacks.onClick = fn }

function Button(argv) {
  Entity.call(this); // Extend

  new obj({
    text: "A button",
    color: "#cce",
    bgColor: "#000",
    size: 16, // px,
    bounds: {
      width: 0,
      height: 0,
      padd: 8,
    },
    a: {x: 0, y: 0}, b: {x: 0, y: 0}
  }).merge(argv).bind(this);

  this.a = new Vec2(this.a);
  this.b = new Vec2(this.b);

  // draw to measure...

  ctx.fillStyle = this.color;
  ctx.font = this.size + 'px serif';
  ctx.fillText(this.text, -4, -4);

  this.bounds.height = ctx.measureText('M').width;
  this.bounds.width = ctx.measureText(this.text).width;

  // center

  this.a.x -= this.bounds.width / 2;
  this.a.y -= this.bounds.height / 2

  ctx.fillText(this.text, this.a.x, this.a.y);

  // padding rect

  this.bounds.width += this.bounds.padd;
  this.bounds.height += this.bounds.padd;

  this.a.x -= this.bounds.padd / 2;
  this.a.y -= this.bounds.height - this.bounds.padd;

  this.b.x = this.a.x + this.bounds.width;
  this.b.y = this.a.y + this.bounds.height;

  // collider

  this.collider = new ColliderRect(this.a, this.b);
}
Button.prototype = Object.create(Entity.prototype);
Button.prototype.update = function() {
  if (TheMouse.clickHold && this.collider.check(TheMouse.collider)) this.clickCallBack();
}
Button.prototype.render = function() {
  ctx.fillStyle = this.color;
  ctx.font = this.size + 'px serif';

  ctx.fillStyle = this.bgColor;
  ctx.fillRect(this.a.x, this.a.y, this.bounds.width, this.bounds.height);

  ctx.fillStyle = this.color;
  ctx.fillText(this.text, this.a.x + this.bounds.padd / 2, (this.a.y + this.bounds.height / 2) + this.bounds.padd);
}
Button.prototype.onClick = function(fn) {
  if (typeof fn !== 'function') { console.warn("Not a function!"); return false; }

  this.clickCallBack = fn;
}
Button.prototype.clickCallBack = function() {}

// Timer element

function Timer(argv) {
  Entity.call(this, argv);

  new obj({time: 600, text: "Timer text: "}).merge(argv).bind(this);
}
Timer.prototype = Object.create(Entity.prototype);
Timer.prototype.update = function(dt, du) {
  this.time -= du;
  if (this.time < 0) this.time = 0;
}
Timer.prototype.render = function() {
  ctx.font = '20px serif';
  ctx.fillStyle = "#000";
  ctx.fillText(this.text + Math.floor(this.time), this.pos.x, this.pos.y);
}

// Text element

function Text(argv) {
  Entity.call(this, argv);

  new obj({text: "New text", value: 0, size: 12, color: "#000"}).merge(argv).bind(this);
}
Text.prototype = Object.create(Entity.prototype);
Text.prototype.render = function() {
  ctx.font = this.size + 'px serif';
  ctx.fillStyle = this.color;
  ctx.fillText(this.text, this.pos.x, this.pos.y);
}

// Rect extending generic entity

function Rect(argv) {
  Entity.call(this);

  this._colors = ['red', 'green', 'blue', 'yellow', 'purple']

  new obj({
    row: 0,
    col: 0,
    a: {x: 0, y: 0},
    b: {x: 0, y: 0},
    color: this._colors[Math.floor(Math.random() * this._colors.length)],
    isBomb: false,
    isStride: false
  }).merge(argv).bind(this);

  this.a = new Vec2(this.a);
  this.b = new Vec2(this.b);

  this.collider = new ColliderRect(this.a, this.b);

  this.changeState(this.color);
}
Rect.prototype = Object.create(Entity.prototype);
Rect.prototype.changeState = function(ecolor) {
  // Color | bomb | stride
  // 95% -> Color
  // 5% -> Bomb or stride

  this.isBomb = false;
  this.isStride = false;

  if (1 - Math.random() <= 0.05) {
    const bomb = Math.floor(Math.random() * 2) == 1;
    this.isBomb = bomb;
    this.isStride = !bomb;
  } else {
    const colors = this._colors.slice().filter(c => c != ecolor);
    this.color = this._colors[Math.floor(Math.random() * colors.length)];
  }
}
Rect.prototype.render = function() {
  ctx.fillStyle = this.color;
  const w = this.b.x - this.a.x;
  const h = this.b.y - this.a.y;
  ctx.fillRect(this.a.x, this.a.y, w, h);

  // Border

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'black';
  ctx.strokeRect(this.a.x, this.a.y, w, h);

  if(this.isBomb) {
    ctx.lineWidth = 4;
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(this.a.x + (w)/2, this.a.y + (h)/2, 8, 0, 2 * Math.PI);
    ctx.fill();
  }

  if (this.isStride) {
    ctx.lineWidth = 1;
    ctx.fillStyle = 'black';
    ctx.fillRect(this.a.x, this.a.y + h/4, w, h/2);
  }
}

// Scene

function Scene(argv) {
  new obj({name: 'undefined', entities: [], active: false}).merge(argv).bind(this);
}
Scene.prototype.render = function() {
  this.entities.map(e => e.render());
}
Scene.prototype.update = function(dt, du) {
  this.entities.map(e => e.update(dt, du));
}

// Scene manager

function SceneManager(scenes) {
  scenes = Array.isArray(scenes) ? scenes : [];
  this.scenes = scenes.filter(s => s instanceof SceneGamePlay ||
                              s instanceof SceneHome ||
                              s instanceof SceneGameOver);
}
SceneManager.prototype.add = function(scene) {
  this.scenes.push(scene);
}
SceneManager.prototype.invoke = function(name) {
  this.scenes.map(s => { s.active = false; return s;}).filter(s => s.name == name).map(s => s.active = true);
}
SceneManager.prototype.getActiveScene = function() {
  return this.scenes.find(s => s.active);
}

// Scenes

function SceneGamePlay() {
  Scene.call(this, {name: 'gameplay'}); // Extend scene

  this.entities = [];

  const gap = 8;
  const cr = 12, cc = 12;
  const width = Math.floor(canvas.width / cr);
  const height = Math.floor(canvas.height / cc) - 4;

  for(var i = 0; i < cr; i++) {
    for(j = 0; j < cc; j++) {
      const x = j * width + gap;
      const y = i * height + gap;
      const x1 = x + width - gap;
      const y1 = y + width - gap;
      this.entities.push(new Rect({row: i, col: j, a: {x: x, y: y}, b:{x: x1, y: y1}}))
    }
  }

  this.timer = new Timer({pos: {x: 10, y: canvas.height - 10}, time: 1200, text: "Game ends in: "});
  this.score = new Text({pos: {x: canvas.width / 2 - 32, y: canvas.height - 10}, text: "Score: 0", size: 18});

  const findAdjacent = (e, rects, adjacentRects) => {
    const neighbors = rects.filter(b => (Math.abs(b.row - e.row) + Math.abs(b.col - e.col) == 1) && !e.skip);
    e.skip = true;

    neighbors.map(n => adjacentRects.push(n));

    if (neighbors.length > 0) { neighbors.map(n => { findAdjacent(n, rects, adjacentRects); }) }

    return adjacentRects;
  }

  TheMouse.onClick((mouse) => {
    this.entities.map(e => {
      if (e.collider.check(mouse.collider)) {
        const color = e.color;
        let rects = [];

        // if not bomb or stride, find adjacent

        if (!(e.isBomb || e.isStride)) {
          rects = findAdjacent(e, this.entities.filter(e => e.color == color), []);
          rects.map(e => { e.changeState(e.color); e.skip = false; });
        } else {
          if (e.isStride) { rects = this.entities.filter(f => f.row == e.row); }
          if (e.isBomb) { rects = this.entities.filter(f => Math.abs(f.row - e.row) <= 1 && Math.abs(f.col - e.col) <= 1); }

          console.log(rects);

          rects.map(e => e.changeState(e.color));
        }

        if (rects.length > 0) {
          this.score.value += (rects.length - 1) * 80 + Math.pow(((rects.length - 2) / 5), 2);
          this.score.text = "Score: " + Math.floor(this.score.value);

          this.timer.time += Math.floor(10 + ((rects.length - 2) / 3) * 20);
        }
      }
    });
  })
}
SceneGamePlay.prototype = Object.create(Scene.prototype);
SceneGamePlay.prototype.render = function() {
  this.entities.map(e => e.render());
  this.timer.render();
  this.score.render();
}
SceneGamePlay.prototype.update = function(du, dt) {
  this.timer.update(du, dt);
}

function SceneHome() {
  Scene.call(this, {name: 'home'}); // Extend scene

  const btn = new Button({text: 'Click to start the game', size: 32, a: {x: canvas.width / 2, y: canvas.width / 2}});
  btn.onClick(() => TheSceneManager.invoke('gameplay'));

  this.entities.push(btn);
}
SceneHome.prototype = Object.create(Scene.prototype);
SceneHome.prototype.update = function(dt, du) {
  this.entities.map(e => e.update(du, dt));
}

function SceneGameOver() {
  Scene.call(this, {name: 'gameover'}); // Extend scene
}
SceneGameOver.prototype = Object.create(Scene.prototype);

// Instances

const TheMouse = new Mouse();
const TheSceneManager = new SceneManager();

TheSceneManager.add(new SceneHome());
TheSceneManager.add(new SceneGamePlay());
TheSceneManager.add(new SceneGameOver());

TheSceneManager.invoke('home');

// Main loop

(function() {
  var lFrameMs = 0,
    maxFPS = 32,
    dt = 0,
    du = 0,
    fps = 0;

  var tStep = 1000 / maxFPS;

  let scene = TheSceneManager.getActiveScene();

  if (!scene) {
    console.warn("No scene found!");
    return false;
  }

  function loop(tFrame) {
    scene = TheSceneManager.getActiveScene();

    if (tFrame < lFrameMs + (1000 / maxFPS)) {
      window.requestAnimationFrame(loop);
      return;
    }

    fps = 1000 / (tFrame - lFrameMs);

    dt += tFrame - lFrameMs;
    lFrameMs = tFrame;
    du = 1 / tStep;

    // Update

    var updateSteps = 0;

    while (dt >= tStep) {
      scene.update(tStep, du);
      dt -= tStep;

      if(++updateSteps >= 240) {
        dt = 0; // fast-forward
        break;
      }
    }

    // Render

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Debug

    ctx.font = '20px serif';
    ctx.fillStyle = "#000";
    ctx.fillText("fps:" + Math.floor(fps), canvas.width - 60, canvas.height - 10);

    // Scenes

    scene.render();

    // Loop

    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
})();
