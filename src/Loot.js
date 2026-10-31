import * as THREE from 'three';

export class Loot {
  constructor(scene, position, value = 10) {
    this.scene = scene;
    this.value = value;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf7d56a,
      emissive: 0x6d4a00,
      metalness: 0.7,
      roughness: 0.3,
    });

    this.mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat);
    this.mesh.position.copy(position.clone().add(new THREE.Vector3(0, 0.6, 0)));
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
    this.collected = false;
  }

  update(dt, player) {
    if (this.collected) return;
    this.mesh.rotation.y += dt * 2.4;
    this.mesh.position.y += Math.sin(performance.now() * 0.008) * 0.003;

    const distance = this.mesh.position.distanceTo(player.group.position);
    if (distance < 1.4) {
      this.collected = true;
      player.gold += this.value;
      player.showMessage(`+${this.value} gold`);
      this.scene.remove(this.mesh);
      return true;
    }

    return false;
  }
}
