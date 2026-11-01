import * as THREE from 'three';
import { ENEMIES } from './config.js';

export class Enemy {
  constructor(scene, type, x, z, game) {
    this.game = game;
    this.type = type;
    const config = ENEMIES[type];
    if (!config) {
      throw new Error(`Unknown enemy type: ${type}`);
    }

    this.config = config;
    this.dead = false;
    this.health = config.health;
    this.attackCooldown = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    scene.add(this.group);

    const bodyMat = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.7, metalness: 0.15 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.95, 4, 10), bodyMat);
    body.position.y = 0.95;
    body.castShadow = true;
    this.group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 18), new THREE.MeshStandardMaterial({ color: 0xe2d0b7 }));
    head.position.y = 1.8;
    head.castShadow = true;
    this.group.add(head);

    const weapon = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.9, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x2c2d31, roughness: 0.6, metalness: 0.5 })
    );
    weapon.position.set(0.38, 1.05, 0.1);
    weapon.castShadow = true;
    this.group.add(weapon);
  }

  update(dt, player) {
    if (this.dead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    const diff = player.group.position.clone().sub(this.group.position);
    const distance = diff.length();

    if (distance > 0.1) {
      const moveDir = diff.clone();
      moveDir.y = 0;
      if (moveDir.lengthSq() > 0.0001) {
        moveDir.normalize();
        this.group.position.addScaledVector(moveDir, this.config.speed * dt);
        this.group.lookAt(player.group.position.x, this.group.position.y + 1.1, player.group.position.z);
      }
    }

    if (distance < 1.8 && this.attackCooldown <= 0) {
      player.takeDamage(this.config.damage);
      this.attackCooldown = this.config.attackRate;
    }
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.health -= amount;

    if (this.health <= 0) {
      this.dead = true;
      this.game.onEnemyDefeated(this);
      this.group.visible = false;
    }
  }
}
