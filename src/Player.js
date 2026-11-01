import * as THREE from 'three';
import { WEAPONS } from './config.js';

export class Player {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.inventory = game.inventory;

    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);
    scene.add(this.group);

    this.health = 100;
    this.maxHealth = 100;
    this.mana = 100;
    this.maxMana = 100;
    this.gold = 0;
    this.exp = 0;
    this.level = 1;
    this.speed = 6.2;
    this.attackCooldown = 0;
    this.dashCooldown = 0;
    this.invulnerable = 0;
    this.equipped = 'sword';

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d607a, roughness: 0.7, metalness: 0.15 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x9ab7d2, roughness: 0.45, metalness: 0.5 });
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x564f71, roughness: 0.85, metalness: 0.1 });

    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.15, 4, 10), bodyMat);
    this.body.position.y = 1.0;
    this.body.castShadow = true;
    this.group.add(this.body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20), new THREE.MeshStandardMaterial({ color: 0xeec9a1 }));
    head.position.y = 2.05;
    head.castShadow = true;
    this.group.add(head);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.45), armorMat);
    chest.position.y = 1.3;
    chest.castShadow = true;
    this.group.add(chest);

    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.1), capeMat);
    cape.position.set(0, 1.4, -0.5);
    this.group.add(cape);

    this.weaponHolder = new THREE.Group();
    this.weaponHolder.position.set(0.72, 1.25, 0.2);
    this.group.add(this.weaponHolder);

    this.weaponMesh = null;
    this.equipWeapon('sword');
  }

  equipWeapon(key) {
    if (!WEAPONS[key]) return;

    if (this.weaponMesh) {
      this.weaponHolder.remove(this.weaponMesh);
    }

    const weapon = WEAPONS[key];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(key === 'spear' ? 0.12 : key === 'mace' ? 0.2 : 0.16, key === 'mace' ? 0.9 : 1.2, key === 'spear' ? 0.12 : 0.16),
      new THREE.MeshStandardMaterial({ color: weapon.color, metalness: 0.8, roughness: 0.3 })
    );

    if (key === 'spear') {
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(0.9, 0.1, 0.05);
    } else if (key === 'mace') {
      mesh.position.set(0.72, -0.08, 0.05);
    } else {
      mesh.position.set(0.62, 0.12, 0.05);
    }

    mesh.castShadow = true;
    this.weaponHolder.add(mesh);
    this.weaponMesh = mesh;
    this.equipped = key;
  }

  update(dt, input) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    let moveX = Number(input.right) - Number(input.left);
    let moveZ = Number(input.down) - Number(input.up);

    if (moveX !== 0 || moveZ !== 0) {
      const xz = new THREE.Vector3(moveX, 0, moveZ);
      xz.normalize();
      const yRotation = Math.atan2(xz.x, xz.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, yRotation, dt * 8);
      this.group.position.x += xz.x * this.speed * dt;
      this.group.position.z += xz.z * this.speed * dt;
      this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -22, 22);
      this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -22, 22);
    }

    if (input.attack && this.attackCooldown <= 0) {
      this.attack();
    }

    if (input.dash && this.dashCooldown <= 0) {
      this.dash();
    }

    if (input.heal && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 18);
      input.heal = false;
      this.showMessage('+18 HP');
    }

    if (this.weaponMesh) {
      const swing = Math.sin(performance.now() * 0.012) * 0.3;
      this.weaponHolder.rotation.z = -0.7 + swing * (this.attackCooldown > 0 ? 1.2 : 0.4);
    }
  }

  dash() {
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    this.group.position.add(forward.multiplyScalar(2.5));
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -22, 22);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -22, 22);
    this.dashCooldown = 1.35;
    this.showMessage('Dash');
  }

  attack() {
    const weapon = WEAPONS[this.equipped];
    this.attackCooldown = weapon.cooldown;

    let landed = false;
    for (const enemy of this.game.enemies) {
      if (enemy.dead) continue;
      const diff = enemy.group.position.clone().sub(this.group.position);
      const distance = diff.length();
      const dot = diff.clone().normalize().dot(new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y));

      if (distance <= weapon.range && dot > -0.1) {
        enemy.takeDamage(weapon.damage);
        landed = true;
      }
    }

    if (landed) {
      this.showMessage(`${weapon.name}`);
    }
  }

  takeDamage(amount) {
    if (this.invulnerable > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 0.5;
    this.showMessage(`-${amount}`);

    if (this.health <= 0) {
      this.game.onPlayerDeath();
    }
  }

  gainXP(amount) {
    this.exp += amount;
    while (this.exp >= this.level * 60) {
      this.exp -= this.level * 60;
      this.level += 1;
      this.maxHealth += 10;
      this.health = this.maxHealth;
      this.showMessage(`Level ${this.level}`);
    }
  }

  showMessage(text) {
    this.game.setMessage(text);
  }
}
