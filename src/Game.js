import * as THREE from 'three';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Inventory } from './Inventory.js';
import { Loot } from './Loot.js';
import { WORLD_LIMIT } from './config.js';

export class Game {
  constructor(root) {
    this.root = root;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec7ff);
    this.scene.fog = new THREE.Fog(0x8ec7ff, 18, 58);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 6, 9);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.root.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.state = 'playing';
    this.enemies = [];
    this.inventory = new Inventory();
    this.loot = [];
    this.messageTimer = 0;
    this.messageValue = '';

    this.initLights();
    this.buildEnvironment();
    this.buildHUD();
    this.bindInput();

    this.player = new Player(this.scene, this);
    this.spawnEnemies();
    this.updateHUD();

    requestAnimationFrame(() => this.animate());
  }

  initLights() {
    const hemi = new THREE.HemisphereLight(0xe9f7ff, 0x1f2c1f, 1.6);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1c2, 1.5);
    sun.position.set(9, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -32;
    this.scene.add(sun);
  }

  buildEnvironment() {
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x7d8c5b,
      roughness: 0.95,
      metalness: 0.05,
    });

    const ground = new THREE.Mesh(new THREE.CylinderGeometry(38, 38, 2.5, 48), groundMat);
    ground.position.y = -1.35;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const pathMat = new THREE.MeshStandardMaterial({ color: 0xcdb98b, roughness: 0.96 });
    const path = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.5, 40), pathMat);
    path.position.y = -0.1;
    this.scene.add(path);

    for (let i = 0; i < 26; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x6c4425, roughness: 0.9 })
      );
      trunk.position.y = 0.9;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0x2e6c44, roughness: 0.8 })
      );
      foliage.position.y = 2.1;
      foliage.castShadow = true;
      tree.add(foliage);

      const angle = (i / 26) * Math.PI * 2;
      const radius = 13 + (i % 5) * 2.2;
      tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      this.scene.add(tree);
    }

    for (let i = 0; i < 20; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.6, 0),
        new THREE.MeshStandardMaterial({ color: 0x7e7d7a, roughness: 0.9 })
      );
      rock.position.set((Math.random() - 0.5) * 30, 0.4, (Math.random() - 0.5) * 30);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    const shrine = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.6, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x7b6a5a, roughness: 0.9 })
    );
    base.position.y = 0.3;
    shrine.add(base);

    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.4, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xa1adbc, metalness: 0.7, roughness: 0.32 })
    );
    center.position.y = 1.8;
    center.castShadow = true;
    shrine.add(center);

    shrine.position.set(0, 0, -14);
    this.scene.add(shrine);
  }

  buildHUD() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div id="top-left">
        <div class="hud-header"><span>Hero</span><span id="level-value">Lv. 1</span></div>
        <div class="stat-row">
          <span class="stat-label">HP</span>
          <div class="bar"><div id="health-fill" class="bar-fill health"></div></div>
          <span id="health-value" class="value">100 / 100</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">XP</span>
          <div class="bar"><div id="xp-fill" class="bar-fill xp"></div></div>
          <span id="xp-value" class="value">0 / 60</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Mana</span>
          <div class="bar"><div id="mana-fill" class="bar-fill mana"></div></div>
          <span id="mana-value" class="value">100 / 100</span>
        </div>
      </div>

      <div id="title-badge">Pharolen</div>

      <div id="top-right">
        <div class="hud-header"><span>Quest</span><span>Thornbane</span></div>
        <div class="stat-row">
          <span class="stat-label">Gold</span>
          <span id="gold-value" class="value">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Weapon</span>
          <span id="weapon-value" class="value">Sunsteel Sword</span>
        </div>
      </div>

      <div id="bottom-left">
        <div class="hud-header"><span>Controls</span></div>
        <div id="controls">
          <div class="controls-row"><span><span class="key">WASD</span> Move</span><span><span class="key">M1</span> Attack</span></div>
          <div class="controls-row"><span><span class="key">Shift</span> Dash</span><span><span class="key">H</span> Heal</span></div>
          <div class="controls-row"><span><span class="key">1-3</span> Weapon</span><span><span class="key">E</span> Burst</span></div>
        </div>
      </div>

      <div id="bottom-right">
        <div class="hud-header"><span>Inventory</span></div>
        <div id="inventory"></div>
      </div>

      <div id="message">Welcome to Pharolen</div>
    `;

    this.root.appendChild(hud);

    this.ui = {
      health: document.getElementById('health-fill'),
      xp: document.getElementById('xp-fill'),
      mana: document.getElementById('mana-fill'),
      healthValue: document.getElementById('health-value'),
      xpValue: document.getElementById('xp-value'),
      manaValue: document.getElementById('mana-value'),
      level: document.getElementById('level-value'),
      gold: document.getElementById('gold-value'),
      weapon: document.getElementById('weapon-value'),
      inventory: document.getElementById('inventory'),
      message: document.getElementById('message'),
    };
  }

  bindInput() {
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false,
      dash: false,
      heal: false,
    };

    const keymap = {
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right',
      ShiftLeft: 'dash',
      ShiftRight: 'dash',
      Space: 'dash',
      KeyH: 'heal',
      Digit1: 'weapon1',
      Digit2: 'weapon2',
      Digit3: 'weapon3',
    };

    window.addEventListener('keydown', (event) => {
      const mapped = keymap[event.code];
      if (mapped === 'weapon1') {
        this.player.equipWeapon('sword');
        this.inventory.equip('sword');
        this.setMessage('Sunsteel Sword equipped');
      }
      if (mapped === 'weapon2') {
        this.player.equipWeapon('spear');
        this.inventory.equip('spear');
        this.setMessage('Aurelian Spear equipped');
      }
      if (mapped === 'weapon3') {
        this.player.equipWeapon('mace');
        this.inventory.equip('mace');
        this.setMessage('Gilded Mace equipped');
      }

      if (mapped && ['up', 'down', 'left', 'right'].includes(mapped)) {
        this.input[mapped] = true;
      }
      if (mapped === 'dash') this.input.dash = true;
      if (mapped === 'heal') this.input.heal = true;
      if (event.code === 'KeyJ') this.input.attack = true;
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'KeyW') this.input.up = false;
      if (event.code === 'KeyS') this.input.down = false;
      if (event.code === 'KeyA') this.input.left = false;
      if (event.code === 'KeyD') this.input.right = false;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'Space') this.input.dash = false;
      if (event.code === 'KeyH') this.input.heal = false;
      if (event.code === 'KeyJ') this.input.attack = false;
    });

    this.renderer.domElement.addEventListener('pointerdown', () => {
      this.input.attack = true;
    });

    this.renderer.domElement.addEventListener('pointerup', () => {
      this.input.attack = false;
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  spawnEnemies() {
    const spawns = [
      [-8, -10], [8, -12], [-13, 6], [12, 9], [0, 15], [-15, 0], [17, 0], [-6, 17], [9, -3], [0, -12],
    ];

    for (const [x, z] of spawns) {
      const typeRoll = Math.random();
      const type = typeRoll < 0.55 ? 'skirmisher' : typeRoll < 0.82 ? 'brute' : 'wraith';
      this.enemies.push(new Enemy(this.scene, type, x, z, this));
    }
  }

  setMessage(text) {
    this.ui.message.textContent = text;
    this.ui.message.classList.add('visible');
    this.messageTimer = 1.8;
  }

  updateMessage(dt) {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.ui.message.classList.remove('visible');
      }
    }
  }

  updateHUD() {
    const healthPct = (this.player.health / this.player.maxHealth) * 100;
    const xpGoal = this.player.level * 60;
    const xpPct = xpGoal > 0 ? (this.player.exp / xpGoal) * 100 : 0;
    const manaPct = (this.player.mana / this.player.maxMana) * 100;

    this.ui.health.style.width = `${Math.max(0, healthPct)}%`;
    this.ui.xp.style.width = `${Math.max(0, xpPct)}%`;
    this.ui.mana.style.width = `${Math.max(0, manaPct)}%`;

    this.ui.healthValue.textContent = `${Math.ceil(this.player.health)} / ${this.player.maxHealth}`;
    this.ui.xpValue.textContent = `${Math.ceil(this.player.exp)} / ${xpGoal}`;
    this.ui.manaValue.textContent = `${Math.ceil(this.player.mana)} / ${this.player.maxMana}`;
    this.ui.level.textContent = `Lv. ${this.player.level}`;
    this.ui.gold.textContent = String(this.player.gold);
    this.ui.weapon.textContent = this.player.equipped.charAt(0).toUpperCase() + this.player.equipped.slice(1);

    this.ui.inventory.innerHTML = '';
    for (const weapon of this.inventory.all()) {
      const pill = document.createElement('div');
      pill.className = `item-pill ${this.inventory.getEquipped() === weapon ? 'equipped' : ''}`;
      pill.textContent = weapon;
      this.ui.inventory.appendChild(pill);
    }
  }

  onEnemyDefeated(enemy) {
    this.player.gainXP(enemy.config.xp);
    this.loot.push(new Loot(this.scene, enemy.group.position.clone(), 10 + enemy.config.xp));
    this.setMessage(`${enemy.config.name} defeated`);
  }

  onPlayerDeath() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.setMessage('You fell in battle — refresh to try again');
  }

  updateCamera(dt) {
    const offset = new THREE.Vector3(0, 6, 8).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.group.rotation.y);
    const desired = this.player.group.position.clone().add(offset);
    this.camera.position.lerp(desired, 1 - Math.pow(0.01, dt));
    this.camera.lookAt(this.player.group.position.clone().add(new THREE.Vector3(0, 1.6, 0)));
  }

  animate() {
    const dt = Math.min(this.clock.getDelta(), 0.033);

    if (this.state === 'playing') {
      this.player.update(dt, this.input);

      for (const enemy of this.enemies) {
        enemy.update(dt, this.player);
      }

      for (const item of this.loot) {
        item.update(dt, this.player);
      }
      this.loot = this.loot.filter((item) => !item.collected);

      this.updateMessage(dt);
      this.updateCamera(dt);
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }
}
